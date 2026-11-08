"""Account recovery delivery and verification helpers."""

import hashlib
import hmac
import ipaddress
import re
import secrets
from datetime import datetime, timedelta, timezone as utc_timezone

import requests
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import salted_hmac

from user.models import PhoneChallenge, RecoveryRequest, User


class DeliveryError(Exception):
    pass


def normalize_phone(value):
    raw = str(value or "")
    if not re.fullmatch(r"[0-9\s-]+", raw):
        raise ValueError("010으로 시작하는 휴대폰 번호를 입력해주세요.")
    digits = re.sub(r"\D", "", raw)
    if not re.fullmatch(r"010\d{8}", digits):
        raise ValueError("010으로 시작하는 휴대폰 번호를 입력해주세요.")
    return digits


def request_hash(value):
    return salted_hmac("account-recovery-rate", value).hexdigest()


def request_ip(request):
    # nginx sets X-Real-IP from its own remote_addr. Trust it only over loopback.
    peer = request.META.get("REMOTE_ADDR", "unknown")
    if peer in ("127.0.0.1", "::1"):
        forwarded = request.META.get("HTTP_X_REAL_IP", "")
        try:
            return str(ipaddress.ip_address(forwarded))
        except ValueError:
            pass
    return peer


def rate_limited(kind, subject, request, actor=None):
    now = timezone.now()
    subject_hash = request_hash(subject)
    ip_hash = request_hash(request_ip(request))
    actor_hash = request_hash(f"user:{actor.pk}") if actor is not None else ""
    recent = RecoveryRequest.objects.all()
    sms_scope = recent.filter(kind__startswith="sms_")
    subject_scope = sms_scope if kind.startswith("sms_") else recent.filter(kind=kind)
    if subject_scope.filter(subject_hash=subject_hash, created_at__gte=now - timedelta(minutes=1)).exists():
        return True
    if subject_scope.filter(subject_hash=subject_hash, created_at__gte=now - timedelta(days=1)).count() >= 5:
        return True
    if kind.startswith("sms_"):
        if actor_hash and sms_scope.filter(actor_hash=actor_hash, created_at__gte=now - timedelta(days=1)).count() >= 5:
            return True
        if sms_scope.filter(ip_hash=ip_hash, created_at__gte=now - timedelta(hours=1)).count() >= 10:
            return True
        if sms_scope.filter(ip_hash=ip_hash, created_at__gte=now - timedelta(days=1)).count() >= 30:
            return True
        # Circuit breaker for the whole service if many IPs coordinate requests.
        if sms_scope.filter(created_at__gte=now - timedelta(hours=1)).count() >= 200:
            return True
    elif recent.filter(ip_hash=ip_hash, created_at__gte=now - timedelta(hours=1)).count() >= 200:
        return True
    RecoveryRequest.objects.create(kind=kind, subject_hash=subject_hash, ip_hash=ip_hash, actor_hash=actor_hash)
    return False


def code_digest(challenge_id, code):
    return salted_hmac("phone-verification-code", f"{challenge_id}:{code}").hexdigest()


def send_sms(phone, code):
    if not settings.PHONE_RECOVERY_ENABLED:
        raise DeliveryError("휴대폰 인증 서비스가 준비되지 않았습니다.")
    date = datetime.now(utc_timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    salt = secrets.token_hex(16)
    signature = hmac.new(
        settings.SOLAPI_API_SECRET.encode(), (date + salt).encode(), hashlib.sha256
    ).hexdigest()
    authorization = (
        f"HMAC-SHA256 apiKey={settings.SOLAPI_API_KEY}, date={date}, "
        f"salt={salt}, signature={signature}"
    )
    try:
        response = requests.post(
            "https://api.solapi.com/messages/v4/send-many/detail",
            json={"messages": [{
                "to": phone,
                "from": settings.SOLAPI_SENDER,
                "text": f"[와키피디아] 인증번호 {code} (5분 유효)",
                "type": "SMS",
                "autoTypeDetect": False,
            }]},
            headers={"Authorization": authorization},
            timeout=8,
        )
        response.raise_for_status()
        result = response.json()
        if result.get("failedMessageList") or not result.get("messageList"):
            raise DeliveryError("문자 접수에 실패했습니다.")
    except (requests.RequestException, ValueError) as exc:
        raise DeliveryError("문자 발송에 실패했습니다.") from exc


def create_phone_challenge(phone, purpose, request, user=None):
    if rate_limited(f"sms_{purpose}", phone, request, actor=user):
        return None
    code = f"{secrets.randbelow(1_000_000):06d}"
    challenge = PhoneChallenge(
        phone_number=phone,
        purpose=purpose,
        user=user,
        ip_hash=request_hash(request_ip(request)),
        expires_at=timezone.now() + timedelta(minutes=5),
    )
    challenge.code_hash = code_digest(challenge.id, code)
    challenge.save()
    try:
        send_sms(phone, code)
    except DeliveryError:
        challenge.delete()
        raise
    PhoneChallenge.objects.filter(
        phone_number=phone, purpose=purpose, used_at__isnull=True
    ).exclude(pk=challenge.pk).update(used_at=timezone.now())
    return challenge


@transaction.atomic
def consume_phone_challenge(challenge_id, code, purpose, user=None):
    challenge = PhoneChallenge.objects.select_for_update().filter(
        pk=challenge_id, purpose=purpose
    ).first()
    if not challenge or challenge.used_at or challenge.expires_at <= timezone.now():
        return None
    if purpose == PhoneChallenge.PURPOSE_LINK and challenge.user_id != user.pk:
        return None
    if challenge.attempts >= 5:
        return None
    challenge.attempts += 1
    valid = hmac.compare_digest(challenge.code_hash, code_digest(challenge.id, str(code)))
    if valid:
        challenge.used_at = timezone.now()
    challenge.save(update_fields=["attempts", "used_at"])
    return challenge if valid else None


def send_password_reset_email(user, reset_url):
    if not settings.EMAIL_RECOVERY_ENABLED:
        raise DeliveryError("이메일 발송 서비스가 준비되지 않았습니다.")
    subject = "[와키피디아] 비밀번호 재설정"
    body = f"비밀번호 재설정을 요청하셨습니다. 아래 링크는 1시간 동안 유효합니다.\n\n{reset_url}\n\n요청하지 않으셨다면 이 메일을 무시하세요."
    try:
        if settings.SES_FROM_EMAIL:
            import boto3
            from botocore.config import Config

            boto3.client(
                "ses", region_name=settings.SES_REGION_NAME,
                config=Config(connect_timeout=5, read_timeout=8, retries={"max_attempts": 1}),
            ).send_email(
                Source=settings.SES_FROM_EMAIL,
                Destination={"ToAddresses": [user.email]},
                Message={
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {"Text": {"Data": body, "Charset": "UTF-8"}},
                },
            )
        else:
            send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
    except Exception as exc:
        raise DeliveryError("이메일 발송에 실패했습니다.") from exc

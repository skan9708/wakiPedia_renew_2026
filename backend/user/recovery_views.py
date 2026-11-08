import logging
import uuid
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from user.models import PhoneChallenge, User
from user.recovery import (
    DeliveryError, consume_phone_challenge, create_phone_challenge,
    normalize_phone, rate_limited, send_password_reset_email,
)

logger = logging.getLogger(__name__)


class EmailSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField()


class PhoneSerializer(serializers.Serializer):
    phone = serializers.CharField(max_length=30)
    phoneConsent = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if self.context.get("consent_required") and not attrs.get("phoneConsent"):
            raise serializers.ValidationError({"phoneConsent": "휴대폰 번호 수집·이용 동의가 필요합니다."})
        return attrs

    def validate_phone(self, value):
        try:
            return normalize_phone(value)
        except ValueError as exc:
            raise serializers.ValidationError(str(exc)) from exc


class CodeSerializer(serializers.Serializer):
    challengeId = serializers.UUIDField()
    code = serializers.RegexField(r"^\d{6}$")


class RecoveryStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({
            "phoneEnabled": settings.PHONE_RECOVERY_ENABLED,
            "emailEnabled": settings.EMAIL_RECOVERY_ENABLED,
        })


class LinkPhoneSendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.PHONE_RECOVERY_ENABLED:
            return Response({"detail": "휴대폰 인증 서비스가 준비되지 않았습니다."}, status=503)
        serializer = PhoneSerializer(data=request.data, context={"consent_required": True})
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        if User.objects.filter(phone_number=phone).exclude(pk=request.user.pk).exists():
            return Response({"detail": "다른 계정에 등록된 번호입니다."}, status=400)
        try:
            challenge = create_phone_challenge(phone, PhoneChallenge.PURPOSE_LINK, request, request.user)
        except DeliveryError:
            return Response({"detail": "문자 발송에 실패했습니다. 잠시 후 다시 시도해주세요."}, status=503)
        if not challenge:
            return Response({"detail": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."}, status=429)
        return Response({"challengeId": str(challenge.id)})


class SignupPhoneSendView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not settings.PHONE_RECOVERY_ENABLED:
            return Response({"detail": "휴대폰 인증 서비스가 준비되지 않았습니다."}, status=503)
        serializer = PhoneSerializer(data=request.data, context={"consent_required": True})
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        if User.objects.filter(phone_number=phone).exists():
            if rate_limited("sms_signup", phone, request):
                return Response({"detail": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."}, status=429)
            return Response({"challengeId": str(uuid.uuid4())})
        try:
            challenge = create_phone_challenge(phone, PhoneChallenge.PURPOSE_SIGNUP, request)
        except DeliveryError:
            return Response({"detail": "문자 발송에 실패했습니다. 잠시 후 다시 시도해주세요."}, status=503)
        if not challenge:
            return Response({"detail": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."}, status=429)
        return Response({"challengeId": str(challenge.id)})


class LinkPhoneVerifyView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        challenge = consume_phone_challenge(
            serializer.validated_data["challengeId"],
            serializer.validated_data["code"],
            PhoneChallenge.PURPOSE_LINK,
            request.user,
        )
        if not challenge:
            return Response({"detail": "인증번호가 올바르지 않거나 만료되었습니다."}, status=400)
        try:
            with transaction.atomic():
                user = User.objects.select_for_update().get(pk=request.user.pk)
                user.phone_number = challenge.phone_number
                user.phone_verified_at = timezone.now()
                user.phone_consent_at = timezone.now()
                user.save(update_fields=["phone_number", "phone_verified_at", "phone_consent_at"])
        except IntegrityError:
            return Response({"detail": "다른 계정에 등록된 번호입니다."}, status=400)
        return Response({"phone": challenge.phone_number})


class RemovePhoneView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        request.user.phone_number = None
        request.user.phone_verified_at = None
        request.user.phone_consent_at = None
        request.user.save(update_fields=["phone_number", "phone_verified_at", "phone_consent_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class FindEmailSendView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not settings.PHONE_RECOVERY_ENABLED:
            return Response({"detail": "휴대폰 인증 서비스가 준비되지 않았습니다."}, status=503)
        serializer = PhoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        phone = serializer.validated_data["phone"]
        challenge_id = str(uuid.uuid4())
        if User.objects.filter(phone_number=phone, phone_verified_at__isnull=False, is_active=True).exists():
            try:
                challenge = create_phone_challenge(phone, PhoneChallenge.PURPOSE_FIND_EMAIL, request)
                if challenge:
                    challenge_id = str(challenge.id)
            except DeliveryError:
                logger.exception("Find-email SMS delivery failed")
        else:
            rate_limited("sms_find_email", phone, request)
        # Identical response whether a matching account exists or not.
        return Response({"challengeId": challenge_id, "detail": "등록된 번호라면 인증번호를 보내드렸습니다."})


class FindEmailVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        challenge = consume_phone_challenge(
            serializer.validated_data["challengeId"],
            serializer.validated_data["code"],
            PhoneChallenge.PURPOSE_FIND_EMAIL,
        )
        if not challenge:
            return Response({"detail": "인증번호가 올바르지 않거나 만료되었습니다."}, status=400)
        user = User.objects.filter(phone_number=challenge.phone_number, is_active=True).first()
        if not user:
            return Response({"detail": "등록된 계정을 찾을 수 없습니다."}, status=404)
        if user.kakao_id and not user.has_usable_password():
            return Response({"provider": "kakao"})
        return Response({"provider": "email", "email": user.email})


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not settings.EMAIL_RECOVERY_ENABLED:
            return Response({"detail": "이메일 재설정 서비스가 준비되지 않았습니다."}, status=503)
        serializer = EmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        if not rate_limited("password_reset", email, request):
            user = User.objects.filter(email__iexact=email, is_active=True).first()
            if user and user.has_usable_password() and not user.email.endswith("@kakao.local"):
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                token = default_token_generator.make_token(user)
                reset_url = f"{settings.PUBLIC_SITE_URL}/auth/reset-password?{urlencode({'uid': uid, 'token': token})}"
                try:
                    send_password_reset_email(user, reset_url)
                except DeliveryError:
                    logger.exception("Password reset email delivery failed")
        return Response({"detail": "계정이 확인되면 재설정 링크를 보내드리겠습니다."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        password = serializer.validated_data["password"]
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id, is_active=True)
        except (ValueError, TypeError, OverflowError, UnicodeDecodeError, User.DoesNotExist):
            user = None
        if not user or not user.has_usable_password() or not default_token_generator.check_token(user, token):
            return Response({"detail": "재설정 링크가 유효하지 않거나 만료되었습니다."}, status=400)
        try:
            validate_password(password, user=user)
        except ValidationError as exc:
            return Response({"password": exc.messages}, status=400)
        user.set_password(password)
        user.auth_epoch += 1
        user.save(update_fields=["password", "auth_epoch"])
        return Response({"detail": "비밀번호가 변경되었습니다. 다시 로그인해주세요."})

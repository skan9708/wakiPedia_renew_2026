import requests as http_requests
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import update_last_login
from django.core import signing
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from user.models import User
from user.models import PhoneChallenge
from user.recovery import consume_phone_challenge, rate_limited
from user.serializers import (
    SignupSerializer, LoginSerializer, UserSerializer, ProfileUpdateSerializer
)


def get_tokens_for_user(user):
    """로그인 토큰 발급 (마지막 로그인 시각도 함께 기록)"""
    update_last_login(None, user)
    refresh = RefreshToken.for_user(user)
    refresh["auth_epoch"] = user.auth_epoch
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                challenge = None
                if serializer.validated_data.get("phoneChallengeId"):
                    challenge = consume_phone_challenge(
                        serializer.validated_data["phoneChallengeId"],
                        serializer.validated_data["phoneCode"],
                        PhoneChallenge.PURPOSE_SIGNUP,
                    )
                    if not challenge:
                        return Response({"phoneCode": ["휴대폰 인증번호가 올바르지 않거나 만료되었습니다."]}, status=400)
                    if User.objects.filter(phone_number=challenge.phone_number).exists():
                        return Response({"phoneCode": ["이미 등록된 휴대폰 번호입니다."]}, status=400)
                user = serializer.save()
                if challenge:
                    user.phone_number = challenge.phone_number
                    user.phone_verified_at = timezone.now()
                    user.phone_consent_at = timezone.now()
                    user.save(update_fields=["phone_number", "phone_verified_at", "phone_consent_at"])
        except IntegrityError:
            return Response({"detail": "이메일 또는 휴대폰 번호가 이미 등록되어 있습니다."}, status=400)
        tokens = get_tokens_for_user(user)
        return Response(
            {**tokens, "user": UserSerializer(user, context={"request": request}).data},
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if not user:
            return Response(
                {"detail": "이메일 또는 비밀번호가 올바르지 않습니다."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        tokens = get_tokens_for_user(user)
        return Response(
            {**tokens, "user": UserSerializer(user, context={"request": request}).data}
        )


class KakaoLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        code = request.data.get("code")
        redirect_uri = request.data.get("redirect_uri")

        if not code or not redirect_uri:
            return Response({"detail": "code와 redirect_uri가 필요합니다."}, status=400)

        rest_api_key = getattr(settings, "KAKAO_REST_API_KEY", "")
        if not rest_api_key:
            return Response({"detail": "카카오 API 키가 설정되지 않았습니다."}, status=503)

        # 1. 인가 코드로 카카오 액세스 토큰 교환
        token_res = http_requests.post(
            "https://kauth.kakao.com/oauth/token",
            data={
                "grant_type": "authorization_code",
                "client_id": rest_api_key,
                "redirect_uri": redirect_uri,
                "code": code,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )
        if token_res.status_code != 200:
            return Response({"detail": "카카오 토큰 발급 실패"}, status=400)

        kakao_access_token = token_res.json().get("access_token")

        # 2. 카카오 사용자 정보 조회
        user_res = http_requests.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {kakao_access_token}"},
            timeout=10,
        )
        if user_res.status_code != 200:
            return Response({"detail": "카카오 사용자 정보 조회 실패"}, status=400)

        user_info = user_res.json()
        kakao_id = str(user_info["id"])
        kakao_account = user_info.get("kakao_account", {})
        kakao_email = kakao_account.get("email") or ""
        email_verified = bool(kakao_email) and kakao_account.get("is_email_verified", False)
        nickname = (
            kakao_account.get("profile", {}).get("nickname")
            or f"kakao_{kakao_id[:6]}"
        )

        # 3. 기존 유저 조회 or 생성. 같은 이메일만으로는 계정을 연결하지 않는다.
        is_new_user = False
        user = User.objects.filter(kakao_id=kakao_id).first()
        if not user and email_verified:
            existing = User.objects.filter(email__iexact=kakao_email).first()
            if existing:
                if not existing.is_active:
                    return Response({"detail": "비활성 계정은 로그인할 수 없습니다."}, status=403)
                if existing.kakao_id or not existing.has_usable_password():
                    return Response({"detail": "이 이메일은 이미 다른 로그인 계정에 연결되어 있습니다. 고객센터에 문의해주세요."}, status=409)
                link_token = signing.dumps(
                    {"user_id": existing.pk, "email": existing.email, "kakao_id": kakao_id},
                    salt="kakao-account-link",
                )
                return Response({
                    "linkRequired": True,
                    "linkToken": link_token,
                    "email": existing.email,
                    "detail": "기존 이메일 계정의 비밀번호를 확인하면 카카오 로그인을 연결할 수 있습니다.",
                }, status=409)
        if not user:
            email = kakao_email
            if not email or User.objects.filter(email__iexact=email).exists():
                email = f"kakao_{kakao_id}@kakao.local"
            user = User(kakao_id=kakao_id, email=email, nickname=nickname)
            user.set_unusable_password()
            user.save()
            is_new_user = True

        if not user.is_active:
            return Response({"detail": "비활성 계정은 로그인할 수 없습니다."}, status=403)

        tokens = get_tokens_for_user(user)
        return Response(
            {**tokens, "user": UserSerializer(user, context={"request": request}).data, "isNewUser": is_new_user}
        )


class KakaoLinkView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        link_token = request.data.get("linkToken")
        password = request.data.get("password")
        if not isinstance(link_token, str) or not isinstance(password, str) or not password:
            return Response({"detail": "연동 정보와 기존 계정 비밀번호를 입력해주세요."}, status=400)
        try:
            payload = signing.loads(link_token, salt="kakao-account-link", max_age=600)
            user = User.objects.get(pk=payload["user_id"], email__iexact=payload["email"])
        except (signing.BadSignature, KeyError, ValueError, TypeError, User.DoesNotExist):
            return Response({"detail": "카카오 연동 요청이 만료되었습니다. 다시 시도해주세요."}, status=400)

        if not user.is_active or user.kakao_id or not user.has_usable_password():
            return Response({"detail": "이 계정은 카카오 연동을 진행할 수 없습니다."}, status=400)
        if rate_limited("kakao_link", user.email, request):
            return Response({"detail": "연동 시도가 너무 많습니다. 잠시 후 다시 시도해주세요."}, status=429)
        if not user.check_password(password):
            return Response({"detail": "기존 계정 비밀번호가 올바르지 않습니다."}, status=400)

        try:
            with transaction.atomic():
                updated = User.objects.filter(pk=user.pk, kakao_id__isnull=True, is_active=True).update(
                    kakao_id=payload["kakao_id"]
                )
                if not updated:
                    return Response({"detail": "이미 연결된 계정입니다. 다시 로그인해주세요."}, status=409)
        except IntegrityError:
            return Response({"detail": "이미 다른 계정에 연결된 카카오 계정입니다."}, status=409)
        user.refresh_from_db()
        tokens = get_tokens_for_user(user)
        return Response({**tokens, "user": UserSerializer(user, context={"request": request}).data, "isNewUser": False})

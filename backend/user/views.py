import requests as http_requests
from django.conf import settings
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from user.models import User
from user.serializers import (
    SignupSerializer, LoginSerializer, UserSerializer, ProfileUpdateSerializer
)


def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
    }


class SignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
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

        # 3. 기존 유저 조회 or 생성
        user = User.objects.filter(kakao_id=kakao_id).first()
        if not user and email_verified:
            # 같은 이메일로 이미 가입한 계정이 있으면 그 계정에 카카오를 연결
            user = User.objects.filter(email__iexact=kakao_email, kakao_id__isnull=True).first()
            if user:
                user.kakao_id = kakao_id
                user.save(update_fields=["kakao_id"])
        if not user:
            email = kakao_email
            if not email or User.objects.filter(email__iexact=email).exists():
                email = f"kakao_{kakao_id}@kakao.local"
            user = User(kakao_id=kakao_id, email=email, nickname=nickname)
            user.set_unusable_password()
            user.save()

        tokens = get_tokens_for_user(user)
        return Response(
            {**tokens, "user": UserSerializer(user, context={"request": request}).data}
        )

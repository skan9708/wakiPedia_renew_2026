from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.tokens import RefreshToken

from user.models import User


def check_epoch(token, user):
    # Existing tokens issued before this feature have no claim and remain valid
    # until the user actually resets their password.
    if token.get("auth_epoch", 0) != user.auth_epoch:
        raise AuthenticationFailed("로그인 상태가 만료되었습니다. 다시 로그인해주세요.")


class EpochJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        check_epoch(validated_token, user)
        return user


class EpochTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresh = RefreshToken(attrs["refresh"])
        user = User.objects.filter(pk=refresh[api_settings.USER_ID_CLAIM], is_active=True).first()
        if not user:
            raise AuthenticationFailed("계정을 찾을 수 없습니다.")
        check_epoch(refresh, user)
        return super().validate(attrs)

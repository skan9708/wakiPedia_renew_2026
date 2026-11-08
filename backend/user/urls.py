from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from user import views
from user import recovery_views
from user.token_auth import EpochTokenRefreshSerializer


class EpochTokenRefreshView(TokenRefreshView):
    serializer_class = EpochTokenRefreshSerializer

urlpatterns = [
    path("signup/", views.SignupView.as_view(), name="signup"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("kakao/", views.KakaoLoginView.as_view(), name="kakao-login"),
    path("kakao/link/", views.KakaoLinkView.as_view(), name="kakao-link"),
    path("token/refresh/", EpochTokenRefreshView.as_view(), name="token-refresh"),
    path("recovery/status/", recovery_views.RecoveryStatusView.as_view()),
    path("signup/phone/send/", recovery_views.SignupPhoneSendView.as_view()),
    path("find-email/send/", recovery_views.FindEmailSendView.as_view()),
    path("find-email/verify/", recovery_views.FindEmailVerifyView.as_view()),
    path("password-reset/request/", recovery_views.PasswordResetRequestView.as_view()),
    path("password-reset/confirm/", recovery_views.PasswordResetConfirmView.as_view()),
]

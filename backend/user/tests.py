from unittest.mock import patch
from urllib.parse import parse_qs, urlparse
from datetime import timedelta
import re

from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from user.models import RecoveryRequest, SignupEmailChallenge, User
from user.recovery import DeliveryError, rate_limited, request_ip, send_sms, send_password_reset_email


class AccountRecoveryTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="member@example.com", password="oldpassword123", nickname="멤버"
        )

    @override_settings(PHONE_RECOVERY_ENABLED=True)
    @patch("user.recovery.send_sms")
    def test_phone_link_and_find_email(self, sms):
        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/me/phone/send/", {"phone": "010-1234-5678", "phoneConsent": True})
        self.assertEqual(response.status_code, 200)
        code = sms.call_args.args[1]
        challenge_id = response.data["challengeId"]
        wrong = self.client.post("/api/me/phone/verify/", {"challengeId": challenge_id, "code": "000000" if code != "000000" else "111111"})
        self.assertEqual(wrong.status_code, 400)
        verified = self.client.post("/api/me/phone/verify/", {"challengeId": challenge_id, "code": code})
        self.assertEqual(verified.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.phone_number, "01012345678")
        self.assertIsNotNone(self.user.phone_verified_at)
        self.assertIsNotNone(self.user.phone_consent_at)
        self.assertEqual(self.client.post("/api/me/phone/verify/", {"challengeId": challenge_id, "code": code}).status_code, 400)

        self.client.force_authenticate(user=None)
        RecoveryRequest.objects.update(created_at=timezone.now() - timedelta(minutes=2))
        found = self.client.post("/api/auth/find-email/send/", {"phone": "01012345678"})
        self.assertEqual(found.status_code, 200)
        code = sms.call_args.args[1]
        result = self.client.post("/api/auth/find-email/verify/", {"challengeId": found.data["challengeId"], "code": code})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["email"], self.user.email)

    @override_settings(PHONE_RECOVERY_ENABLED=True)
    @patch("user.recovery.send_sms")
    def test_signup_phone_is_optional_but_requires_real_code(self, sms):
        self.assertEqual(self.client.post("/api/auth/signup/phone/send/", {"phone": "01099998888"}).status_code, 400)
        response = self.client.post("/api/auth/signup/phone/send/", {"phone": "010-9999-8888", "phoneConsent": True})
        self.assertEqual(response.status_code, 200)
        data = {
            "email": "new@example.com", "nickname": "새 회원",
            "password": "newpassword123", "passwordConfirm": "newpassword123",
            "phoneChallengeId": response.data["challengeId"], "phoneCode": "123456", "phoneConsent": True,
        }
        self.assertEqual(self.client.post("/api/auth/signup/", data).status_code, 400)
        data["phoneCode"] = sms.call_args.args[1]
        self.assertEqual(self.client.post("/api/auth/signup/", data).status_code, 201)
        self.assertEqual(User.objects.get(email="new@example.com").phone_number, "01099998888")

        data = {
            "email": "without-phone@example.com", "nickname": "번호 없는 회원",
            "password": "newpassword123", "passwordConfirm": "newpassword123",
        }
        self.assertEqual(self.client.post("/api/auth/signup/", data).status_code, 201)
        self.assertIsNone(User.objects.get(email=data["email"]).phone_number)

    @override_settings(PHONE_RECOVERY_ENABLED=True)
    @patch("user.recovery.send_sms")
    def test_unknown_phone_has_same_send_response(self, sms):
        result = self.client.post("/api/auth/find-email/send/", {"phone": "01012345678"})
        self.assertEqual(result.status_code, 200)
        self.assertIn("challengeId", result.data)
        sms.assert_not_called()
        self.assertEqual(self.client.post("/api/auth/find-email/verify/", {"challengeId": result.data["challengeId"], "code": "000000"}).status_code, 400)

    @override_settings(EMAIL_RECOVERY_ENABLED=True)
    @patch("user.recovery_views.send_password_reset_email")
    def test_password_reset_link_changes_password_once(self, send_email):
        old_refresh = RefreshToken.for_user(self.user)
        old_access = str(old_refresh.access_token)
        response = self.client.post("/api/auth/password-reset/request/", {"email": self.user.email})
        self.assertEqual(response.status_code, 200)
        link = send_email.call_args.args[1]
        self.assertEqual(urlparse(link).path, "/auth/reset-password")
        params = parse_qs(urlparse(link).query)
        data = {"uid": params["uid"][0], "token": params["token"][0], "password": "newpassword123"}
        self.assertEqual(self.client.post("/api/auth/password-reset/confirm/", data).status_code, 200)
        self.assertEqual(self.client.post("/api/auth/password-reset/confirm/", data).status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("newpassword123"))
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {old_access}")
        self.assertEqual(self.client.get("/api/me/").status_code, 401)
        self.client.credentials()
        self.assertEqual(self.client.post("/api/auth/token/refresh/", {"refresh": str(old_refresh)}).status_code, 401)

    @override_settings(EMAIL_RECOVERY_ENABLED=True)
    @patch("user.recovery_views.send_password_reset_email")
    def test_unknown_email_and_kakao_only_account_get_generic_response(self, send_email):
        unknown = self.client.post("/api/auth/password-reset/request/", {"email": "missing@example.com"})
        kakao = User.objects.create(email="kakao_1@kakao.local", nickname="카카오", kakao_id="1")
        kakao.set_unusable_password()
        kakao.save(update_fields=["password"])
        kakao_result = self.client.post("/api/auth/password-reset/request/", {"email": kakao.email})
        self.assertEqual(unknown.status_code, 200)
        self.assertEqual(unknown.data, kakao_result.data)
        send_email.assert_not_called()

    @override_settings(
        PHONE_RECOVERY_ENABLED=True,
        SOLAPI_API_KEY="test-key", SOLAPI_API_SECRET="test-secret", SOLAPI_SENDER="01011112222",
    )
    @patch("user.recovery.requests.post")
    def test_sms_provider_request_and_failed_acceptance(self, post):
        post.return_value.json.return_value = {"messageList": [{"statusCode": "2000"}], "failedMessageList": []}
        send_sms("01012345678", "123456")
        args, kwargs = post.call_args
        self.assertEqual(args[0], "https://api.solapi.com/messages/v4/send-many/detail")
        self.assertEqual(kwargs["json"]["messages"][0]["to"], "01012345678")
        self.assertIn("HMAC-SHA256 apiKey=test-key", kwargs["headers"]["Authorization"])
        post.return_value.json.return_value = {"messageList": [], "failedMessageList": [{"statusCode": "3040"}]}
        with self.assertRaises(DeliveryError):
            send_sms("01012345678", "123456")

    @override_settings(EMAIL_RECOVERY_ENABLED=True, SES_FROM_EMAIL="verified@example.com", SES_REGION_NAME="ap-northeast-2")
    @patch("boto3.client")
    def test_ses_uses_instance_role_without_smtp_credentials(self, client):
        send_password_reset_email(self.user, "https://wakipedia.co.kr/auth/reset-password?test=1")
        self.assertEqual(client.call_args.args[0], "ses")
        self.assertEqual(client.call_args.kwargs["region_name"], "ap-northeast-2")
        kwargs = client.return_value.send_email.call_args.kwargs
        self.assertEqual(kwargs["Source"], "verified@example.com")
        self.assertEqual(kwargs["Destination"]["ToAddresses"], [self.user.email])

    def test_sms_request_limits_phone_across_purposes_and_account_across_numbers(self):
        request = type("Request", (), {"META": {"REMOTE_ADDR": "127.0.0.1", "HTTP_X_REAL_IP": "203.0.113.1"}})()
        for index in range(5):
            self.assertFalse(rate_limited("sms_link", "01012345678", request, actor=self.user))
            RecoveryRequest.objects.update(created_at=timezone.now() - timedelta(minutes=2))
        self.assertTrue(rate_limited("sms_find_email", "01012345678", request))
        self.assertTrue(rate_limited("sms_link", "01087654321", request, actor=self.user))

    def test_sms_request_limits_ip_even_when_phone_changes(self):
        request = type("Request", (), {"META": {"REMOTE_ADDR": "127.0.0.1", "HTTP_X_REAL_IP": "203.0.113.2"}})()
        for index in range(10):
            self.assertFalse(rate_limited("sms_signup", f"0101234{index:04d}", request))
        self.assertTrue(rate_limited("sms_signup", "01099998888", request))
        self.assertEqual(request_ip(request), "203.0.113.2")
        request.META["REMOTE_ADDR"] = "198.51.100.4"
        self.assertEqual(request_ip(request), "198.51.100.4")


@override_settings(EMAIL_RECOVERY_ENABLED=True, EMAIL_SIGNUP_VERIFICATION_ENABLED=True)
class SignupEmailVerificationTests(APITestCase):
    def signup_data(self, email="new@example.com"):
        return {
            "email": email, "nickname": "새 회원", "password": "newpassword123",
            "passwordConfirm": "newpassword123",
        }

    @patch("user.recovery.send_account_email")
    def test_email_code_is_required_bound_to_address_and_one_use(self, send_email):
        data = self.signup_data()
        self.assertEqual(self.client.post("/api/auth/signup/", data).status_code, 400)
        self.assertFalse(User.objects.filter(email=data["email"]).exists())
        sent = self.client.post("/api/auth/signup/email/send/", {"email": data["email"]})
        self.assertEqual(sent.status_code, 200)
        code = re.search(r"\d{6}", send_email.call_args.args[2]).group()
        data.update(emailChallengeId=sent.data["challengeId"], emailCode=code)
        self.assertEqual(self.client.post("/api/auth/signup/", self.signup_data("other@example.com") | {
            "emailChallengeId": sent.data["challengeId"], "emailCode": code,
        }).status_code, 400)
        self.assertEqual(self.client.post("/api/auth/signup/", data).status_code, 201)
        user = User.objects.get(email=data["email"])
        self.assertIsNotNone(user.email_verified_at)
        user.delete()
        self.assertEqual(self.client.post("/api/auth/signup/", data).status_code, 400)

    @patch("user.recovery.send_account_email")
    def test_wrong_codes_and_send_limit(self, send_email):
        data = self.signup_data()
        sent = self.client.post("/api/auth/signup/email/send/", {"email": data["email"]})
        code = re.search(r"\d{6}", send_email.call_args.args[2]).group()
        wrong_code = "000000" if code != "000000" else "111111"
        data.update(emailChallengeId=sent.data["challengeId"], emailCode=wrong_code)
        for _ in range(5):
            self.assertEqual(self.client.post("/api/auth/signup/", data).status_code, 400)
        data["emailCode"] = code
        self.assertEqual(self.client.post("/api/auth/signup/", data).status_code, 400)
        self.assertFalse(User.objects.filter(email=data["email"]).exists())

        RecoveryRequest.objects.update(created_at=timezone.now() - timedelta(minutes=2))
        for _ in range(4):
            response = self.client.post("/api/auth/signup/email/send/", {"email": data["email"]})
            self.assertEqual(response.status_code, 200)
            RecoveryRequest.objects.update(created_at=timezone.now() - timedelta(minutes=2))
        self.assertEqual(self.client.post("/api/auth/signup/email/send/", {"email": data["email"]}).status_code, 429)

    @patch("user.recovery.send_account_email")
    def test_expired_code_cannot_create_account(self, send_email):
        data = self.signup_data()
        sent = self.client.post("/api/auth/signup/email/send/", {"email": data["email"]})
        code = re.search(r"\d{6}", send_email.call_args.args[2]).group()
        SignupEmailChallenge.objects.filter(pk=sent.data["challengeId"]).update(
            expires_at=timezone.now() - timedelta(seconds=1)
        )
        data.update(emailChallengeId=sent.data["challengeId"], emailCode=code)
        self.assertEqual(self.client.post("/api/auth/signup/", data).status_code, 400)
        self.assertFalse(User.objects.filter(email=data["email"]).exists())

    @patch("user.recovery.send_account_email", side_effect=DeliveryError("send failed"))
    def test_delivery_failure_removes_challenge(self, send_email):
        response = self.client.post("/api/auth/signup/email/send/", {"email": "new@example.com"})
        self.assertEqual(response.status_code, 503)
        self.assertEqual(SignupEmailChallenge.objects.count(), 0)

    @patch("user.recovery.send_account_email")
    def test_existing_email_does_not_receive_signup_code(self, send_email):
        User.objects.create_user(email="member@example.com", nickname="멤버", password="oldpassword123")
        response = self.client.post("/api/auth/signup/email/send/", {"email": "member@example.com"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("challengeId", response.data)
        send_email.assert_not_called()


class KakaoAccountLinkTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="member@example.com", password="existing-password123", nickname="기존 회원"
        )

    def kakao_login(self, *, email="member@example.com", verified=True, kakao_id=12345):
        with patch("user.views.http_requests.post") as token_post, patch("user.views.http_requests.get") as profile_get:
            token_post.return_value.status_code = 200
            token_post.return_value.json.return_value = {"access_token": "test-kakao-access"}
            profile_get.return_value.status_code = 200
            profile_get.return_value.json.return_value = {
                "id": kakao_id,
                "kakao_account": {
                    "email": email,
                    "is_email_verified": verified,
                    "profile": {"nickname": "카카오 회원"},
                },
            }
            return self.client.post("/api/auth/kakao/", {
                "code": "test-code", "redirect_uri": "https://wakipedia.co.kr/auth/kakao/callback",
            })

    @override_settings(KAKAO_REST_API_KEY="test-key")
    def test_matching_email_needs_existing_password_before_linking(self):
        challenge = self.kakao_login()
        self.assertEqual(challenge.status_code, 409)
        self.assertTrue(challenge.data["linkRequired"])
        self.user.refresh_from_db()
        self.assertIsNone(self.user.kakao_id)

        payload = {"linkToken": challenge.data["linkToken"], "password": "wrong-password"}
        self.assertEqual(self.client.post("/api/auth/kakao/link/", payload).status_code, 400)
        RecoveryRequest.objects.update(created_at=timezone.now() - timedelta(minutes=2))
        payload["password"] = "existing-password123"
        linked = self.client.post("/api/auth/kakao/link/", payload)
        self.assertEqual(linked.status_code, 200)
        self.assertEqual(linked.data["user"]["id"], self.user.pk)
        self.user.refresh_from_db()
        self.assertEqual(self.user.kakao_id, "12345")
        self.assertEqual(self.client.post("/api/auth/kakao/link/", payload).status_code, 400)
        self.assertEqual(self.kakao_login().status_code, 200)
        self.assertEqual(self.client.post("/api/auth/login/", {
            "email": self.user.email, "password": "existing-password123",
        }).status_code, 200)

    @override_settings(KAKAO_REST_API_KEY="test-key")
    def test_unverified_kakao_email_does_not_link_existing_account(self):
        result = self.kakao_login(verified=False)
        self.assertEqual(result.status_code, 200)
        self.assertTrue(result.data["isNewUser"])
        self.user.refresh_from_db()
        self.assertIsNone(self.user.kakao_id)
        self.assertEqual(User.objects.count(), 2)

    @override_settings(KAKAO_REST_API_KEY="test-key")
    def test_inactive_linked_account_cannot_log_in_with_kakao(self):
        self.user.kakao_id = "12345"
        self.user.is_active = False
        self.user.save(update_fields=["kakao_id", "is_active"])
        self.assertEqual(self.kakao_login().status_code, 403)

from unittest.mock import patch

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from user.models import User
from wine.management.commands.send_pending_approvals_digest import digest_body
from wine.models import Country, GrapeVariety, Wine, WineDuplicateCandidate
from wine.naming import normalize_grape_name, normalize_wine_names


class WineNamingTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(email="naming@example.com", password="pw", nickname="Tester")
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_only_vintage_year_and_verified_grape_spelling_change(self):
        self.assertEqual(
            normalize_wine_names("35 사우스 카브레네 소비뇽 (2020)", "35 South Cabernet Sauvignon 2020"),
            ("35 사우스 카베르네 소비뇽", "35 South Cabernet Sauvignon"),
        )
        self.assertEqual(
            normalize_wine_names("돔 페리뇽 빈티지 2015", "Dom Perignon Vintage 2015"),
            ("돔 페리뇽 빈티지", "Dom Perignon Vintage"),
        )
        self.assertEqual(normalize_grape_name("카베르네 쇼비뇽"), "카베르네 소비뇽")
        self.assertEqual(normalize_wine_names("몬테스 알파 쉬라", "Montes Alpha Syrah"),
                         ("몬테스 알파 쉬라", "Montes Alpha Syrah"))

    def test_preview_matches_created_wine_and_duplicate_check_uses_clean_name(self):
        original = Wine.objects.create(
            kor_name="텍스트북 카베르네 소비뇽", eng_name="Textbook Cabernet Sauvignon", type="red",
        )
        preview = self.client.get("/api/wines/suggestions/", {
            "nameKr": "텍스트북 카베르네 쇼비뇽 2019",
            "nameEng": "Textbook Cabernet Sauvignon 2019",
        })
        self.assertEqual(preview.data["normalizedNames"], {
            "nameKr": original.kor_name, "nameEng": original.eng_name,
        })
        self.assertEqual(preview.data["results"][0]["id"], original.id)
        created = self.client.post("/api/wines/", {
            "nameKr": "텍스트북 카베르네 쇼비뇽 2019",
            "nameEng": "Textbook Cabernet Sauvignon 2019",
            "wineType": "Red", "breeds": "카베르네 쇼비뇽",
        }, format="json")
        self.assertEqual(created.status_code, 201)
        wine = Wine.objects.get(pk=created.data["id"])
        self.assertEqual((wine.kor_name, wine.eng_name), (original.kor_name, original.eng_name))
        self.assertEqual(list(wine.grape_varieties.values_list("kor_name", flat=True)), ["카베르네 소비뇽"])
        self.assertTrue(WineDuplicateCandidate.objects.filter(source=wine, target=original, status="pending").exists())

    def test_year_alone_is_not_accepted_as_name(self):
        response = self.client.post("/api/wines/", {
            "nameKr": "2020", "nameEng": "Wine 2020", "wineType": "Red",
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_admin_registration_uses_same_rules(self):
        staff = User.objects.create_user(
            email="naming-staff@example.com", password="pw", nickname="Staff", is_staff=True,
        )
        self.client.force_authenticate(user=staff)
        response = self.client.post("/api/admin/wines/", {
            "korName": "텍스트북 카브레네 소비뇽 2019",
            "engName": "Textbook Cabernet Sauvignon (2019)", "type": "Red",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        wine = Wine.objects.get(pk=response.data["id"])
        self.assertEqual((wine.kor_name, wine.eng_name),
                         ("텍스트북 카베르네 소비뇽", "Textbook Cabernet Sauvignon"))


class PendingApprovalDigestTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="staff@example.com", password="pw", nickname="Admin", is_staff=True,
        )

    @override_settings(EMAIL_RECOVERY_ENABLED=True, ADMIN_DIGEST_EMAILS=[], PUBLIC_SITE_URL="https://wakipedia.co.kr")
    @patch("wine.management.commands.send_pending_approvals_digest.send_account_email")
    def test_sends_one_summary_to_staff_only_when_pending(self, send):
        call_command("send_pending_approvals_digest")
        send.assert_not_called()
        Country.objects.create(kor_name="새 원산지", eng_name="New", is_approved=False)
        GrapeVariety.objects.create(kor_name="새 품종", eng_name="New", is_approved=False)
        source = Wine.objects.create(kor_name="새 와인", eng_name="New Wine")
        target = Wine.objects.create(kor_name="기존 와인", eng_name="Existing Wine")
        WineDuplicateCandidate.objects.create(source=source, target=target, score=0.9)
        call_command("send_pending_approvals_digest")
        send.assert_called_once()
        recipient, subject, body = send.call_args.args
        self.assertEqual(recipient, self.admin.email)
        self.assertIn("3건", subject)
        self.assertIn("중복 의심 와인: 1건", body)
        self.assertIn("새 원산지: 1건", body)
        self.assertIn("새 품종: 1건", body)
        self.assertIn("/admin-panel/duplicates", body)

    @override_settings(EMAIL_RECOVERY_ENABLED=False, ADMIN_DIGEST_EMAILS=[])
    def test_dry_run_works_without_mail_and_live_run_fails_clearly(self):
        Country.objects.create(kor_name="새 원산지", eng_name="New", is_approved=False)
        call_command("send_pending_approvals_digest", dry_run=True)
        with self.assertRaisesMessage(CommandError, "Email delivery is not configured"):
            call_command("send_pending_approvals_digest")

    @override_settings(
        EMAIL_RECOVERY_ENABLED=False, EMAIL_SIGNUP_VERIFICATION_ENABLED=False,
        ADMIN_DIGEST_EMAILS=["wakipedia1682@gmail.com"],
        ADMIN_DIGEST_SES_FROM_EMAIL="wakipedia1682@gmail.com",
    )
    @patch("wine.management.commands.send_pending_approvals_digest.send_ses_email")
    def test_digest_ses_does_not_enable_signup_email(self, send):
        Country.objects.create(kor_name="새 원산지", eng_name="New", is_approved=False)
        call_command("send_pending_approvals_digest")
        self.assertEqual(send.call_args.args[0], "wakipedia1682@gmail.com")
        self.assertEqual(send.call_args.args[3], "wakipedia1682@gmail.com")
        self.assertFalse(settings.EMAIL_SIGNUP_VERIFICATION_ENABLED)

    @override_settings(
        EMAIL_RECOVERY_ENABLED=False, EMAIL_SIGNUP_VERIFICATION_ENABLED=False,
        ADMIN_DIGEST_EMAILS=["wakipedia1682@gmail.com"],
        ADMIN_DIGEST_SES_FROM_EMAIL="wakipedia1682@gmail.com",
        ADMIN_DIGEST_GMAIL_USER="wakipedia1682@gmail.com",
        ADMIN_DIGEST_GMAIL_APP_PASSWORD="example-app-password",
    )
    @patch("wine.management.commands.send_pending_approvals_digest.send_ses_email")
    @patch("wine.management.commands.send_pending_approvals_digest.send_mail", return_value=1)
    @patch("wine.management.commands.send_pending_approvals_digest.get_connection")
    def test_digest_gmail_sends_without_enabling_signup_email(self, get_connection, send_mail, send_ses):
        Country.objects.create(kor_name="새 원산지", eng_name="New", is_approved=False)
        call_command("send_pending_approvals_digest")
        send_ses.assert_not_called()
        get_connection.assert_called_once_with(
            "django.core.mail.backends.smtp.EmailBackend",
            host="smtp.gmail.com", port=587,
            username="wakipedia1682@gmail.com", password="example-app-password",
            use_tls=True, timeout=10,
        )
        self.assertEqual(send_mail.call_args.args[2], "wakipedia1682@gmail.com")
        self.assertEqual(send_mail.call_args.args[3], ["wakipedia1682@gmail.com"])
        self.assertFalse(settings.EMAIL_RECOVERY_ENABLED)
        self.assertFalse(settings.EMAIL_SIGNUP_VERIFICATION_ENABLED)

    @override_settings(
        EMAIL_RECOVERY_ENABLED=False, ADMIN_DIGEST_EMAILS=["wakipedia1682@gmail.com"],
        ADMIN_DIGEST_GMAIL_USER="wakipedia1682@gmail.com", ADMIN_DIGEST_GMAIL_APP_PASSWORD="",
    )
    def test_incomplete_gmail_configuration_fails_before_sending(self):
        Country.objects.create(kor_name="새 원산지", eng_name="New", is_approved=False)
        with self.assertRaisesMessage(CommandError, "Gmail digest delivery is incomplete"):
            call_command("send_pending_approvals_digest")

    def test_message_does_not_include_user_data(self):
        body = digest_body({"duplicates": 1, "countries": 2, "grapes": 3})
        self.assertIn("원산지·품종", body)

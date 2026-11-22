from django.test import TestCase
from django.core.cache import cache
from rest_framework.test import APIClient

from feedback.models import Feedback
from user.models import User
from wine.models import Wine


class FeedbackApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.payload = {"category": "idea", "message": "와인 검색 필터를 추가해 주세요."}

    def test_anonymous_submission_is_saved_without_email(self):
        response = self.client.post("/api/feedback/", self.payload, format="json")
        self.assertEqual(response.status_code, 201)
        item = Feedback.objects.get(pk=response.data["id"])
        self.assertEqual(item.category, "idea")
        self.assertEqual(item.email, "")

    def test_email_is_not_accepted(self):
        payload = {**self.payload, "email": "reader@example.com"}
        self.assertEqual(self.client.post("/api/feedback/", payload, format="json").status_code, 400)
        self.assertEqual(Feedback.objects.count(), 0)
        self.assertEqual(self.client.post("/api/feedback/", {**self.payload, "replyConsent": True}, format="json").status_code, 400)
        self.assertEqual(Feedback.objects.count(), 0)

    def test_invalid_category_and_short_message_are_rejected(self):
        response = self.client.post("/api/feedback/", {"category": "invalid", "message": "짧음"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Feedback.objects.count(), 0)

    def test_wine_correction_request_reaches_admin_with_wine_context(self):
        wine = Wine.objects.create(kor_name="샤또 테스트", eng_name="Chateau Test")
        response = self.client.post("/api/feedback/", {
            "category": "wine", "wineId": wine.pk, "message": "한글 이름의 표기를 확인해 주세요.",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Feedback.objects.get(pk=response.data["id"]).wine_id, wine.pk)

        staff = User.objects.create_user(email="staff2@example.com", password="test-password", nickname="관리자", is_staff=True)
        self.client.force_authenticate(user=staff)
        response = self.client.get("/api/admin/feedback/?category=wine")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total"], 1)
        self.assertEqual(response.data["results"][0]["wineId"], wine.pk)
        self.assertEqual(response.data["results"][0]["wineNameKr"], wine.kor_name)

    def test_wine_request_requires_a_visible_wine_and_other_feedback_cannot_attach_one(self):
        wine = Wine.objects.create(kor_name="숨긴 와인", eng_name="Hidden Wine", catalog_visible=False)
        visible_wine = Wine.objects.create(kor_name="보이는 와인", eng_name="Visible Wine")
        payloads = [
            {"category": "wine", "message": "한글 이름의 표기를 확인해 주세요."},
            {"category": "wine", "wineId": 999999, "message": "한글 이름의 표기를 확인해 주세요."},
            {"category": "wine", "wineId": wine.pk, "message": "한글 이름의 표기를 확인해 주세요."},
            {"category": "idea", "wineId": visible_wine.pk, "message": "한글 이름의 표기를 확인해 주세요."},
        ]
        for payload in payloads:
            with self.subTest(payload=payload):
                self.assertEqual(self.client.post("/api/feedback/", payload, format="json").status_code, 400)
        self.assertEqual(Feedback.objects.count(), 0)

    def test_only_staff_can_read_and_manage_feedback(self):
        item = Feedback.objects.create(**self.payload)
        self.assertIn(self.client.get("/api/admin/feedback/").status_code, (401, 403))
        self.assertIn(self.client.patch(f"/api/admin/feedback/{item.pk}/", {"status": "handled"}, format="json").status_code, (401, 403))

        member = User.objects.create_user(email="member@example.com", password="test-password", nickname="회원")
        self.client.force_authenticate(user=member)
        self.assertEqual(self.client.get("/api/admin/feedback/").status_code, 403)

        staff = User.objects.create_user(email="staff@example.com", password="test-password", nickname="관리자", is_staff=True)
        self.client.force_authenticate(user=staff)
        response = self.client.get("/api/admin/feedback/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["message"], self.payload["message"])
        response = self.client.patch(f"/api/admin/feedback/{item.pk}/", {"status": "handled"}, format="json")
        self.assertEqual(response.status_code, 200)
        item.refresh_from_db()
        self.assertIsNotNone(item.handled_at)
        self.assertEqual(self.client.delete(f"/api/admin/feedback/{item.pk}/").status_code, 204)
        self.assertFalse(Feedback.objects.filter(pk=item.pk).exists())

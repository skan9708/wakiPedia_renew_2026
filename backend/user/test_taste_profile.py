from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from user.models import User
from wine.models import Tag, Wine, WineReview


class MyTasteProfileTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="taste@example.com", password="test-password", nickname="테스터",
        )
        self.client.force_authenticate(user=self.user)

    def wine(self, name, *, body=None, sweet=None, acid=None, tanin=None):
        return Wine.objects.create(
            kor_name=name, eng_name=name, type="red",
            source_body=body, source_sweetness=sweet,
            source_acidity=acid, source_tannin=tanin,
        )

    def review(self, wine, rating, **kwargs):
        return WineReview.objects.create(
            wine=wine, user=self.user, text="시음 기록", rating=rating, **kwargs,
        )

    def test_uses_latest_review_per_wine_and_only_four_star_wines(self):
        first = self.wine("첫 번째", body=1, sweet=2, acid=3, tanin=4)
        second = self.wine("두 번째", body=4, sweet=5, acid=1, tanin=2)
        low = self.wine("낮은 점수", body=5, sweet=5, acid=5, tanin=5)
        changed = self.wine("평점 변경", body=5, sweet=5, acid=5, tanin=5)
        cherry = Tag.objects.create(name="체리", category="fruity")
        tobacco = Tag.objects.create(name="담배", category="oaky")
        old_tag = Tag.objects.create(name="예전 태그", category="fruity")

        old_first = self.review(first, 45)
        old_first.tags.add(old_tag)
        WineReview.objects.filter(pk=old_first.pk).update(created_at=timezone.now() - timedelta(days=2))
        new_first = self.review(first, 40)
        new_first.tags.add(cherry)
        private_second = self.review(second, 50, is_public=False)
        private_second.tags.add(cherry, tobacco)
        self.review(low, 35)
        old_changed = self.review(changed, 45)
        WineReview.objects.filter(pk=old_changed.pk).update(created_at=timezone.now() - timedelta(days=2))
        self.review(changed, 35)

        response = self.client.get("/api/me/taste-profile/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["excluded"])
        self.assertEqual(response.data["wineCount"], 2)
        self.assertEqual(response.data["highRatedWineCount"], 2)
        self.assertEqual(response.data["taste"], {
            "body": 1.5, "sweet": 2.5, "acid": 1.0, "tanin": 2.0,
        })
        self.assertEqual(response.data["keywords"], [
            {"text": "체리", "weight": 2}, {"text": "담배", "weight": 1},
        ])

    def test_uses_review_taste_when_catalog_taste_is_missing(self):
        complete = self.wine("직접 기록")
        incomplete = self.wine("특징 일부 없음", body=2)
        self.review(complete, 40, body=1, sweetness=3, acidity=2, tannin=4)
        self.review(incomplete, 45)

        response = self.client.get("/api/me/taste-profile/")
        self.assertEqual(response.data["highRatedWineCount"], 2)
        self.assertEqual(response.data["wineCount"], 1)
        self.assertEqual(response.data["taste"], {
            "body": 1.0, "sweet": 3.0, "acid": 2.0, "tanin": 4.0,
        })

    def test_import_account_has_no_personal_profile(self):
        self.user.is_import_account = True
        self.user.save(update_fields=["is_import_account"])
        self.review(self.wine("모은 리뷰", body=4, sweet=4, acid=4, tanin=4), 50)

        response = self.client.get("/api/me/taste-profile/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["excluded"])
        self.assertIsNone(response.data["taste"])
        self.assertEqual(response.data["wineCount"], 0)

    def test_profile_requires_login(self):
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get("/api/me/taste-profile/").status_code, 401)

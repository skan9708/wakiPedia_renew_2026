from django.test import TestCase
from rest_framework.test import APIClient

from user.models import User
from wine.models import Country, GrapeVariety, Wine, WineDuplicateCandidate, WineReview, WineReviewImage


class DuplicateReviewTests(TestCase):
    def setUp(self):
        self.member = User.objects.create_user(
            email="duplicate-member@example.com", password="test-password", nickname="Member",
        )
        self.staff = User.objects.create_user(
            email="duplicate-staff@example.com", password="test-password", nickname="Staff", is_staff=True,
        )
        self.member_client = APIClient()
        self.member_client.force_authenticate(user=self.member)
        self.staff_client = APIClient()
        self.staff_client.force_authenticate(user=self.staff)
        self.france = Country.objects.create(kor_name="프랑스", eng_name="France")
        self.merlot = GrapeVariety.objects.create(kor_name="메를로", eng_name="Merlot")
        self.target = Wine.objects.create(
            kor_name="샤또 르 게이", eng_name="Chateau Le Gay", type="red", country=self.france,
            image_url="https://example.com/existing.jpg",
        )
        self.target.grape_varieties.add(self.merlot)

    def register(self, **overrides):
        data = {
            "nameKr": "샤또 르 게이", "nameEng": "Chateau Le Gay", "wineType": "Red",
            "regions": "프랑스", "breeds": "메를로",
        }
        data.update(overrides)
        response = self.member_client.post("/api/wines/", data, format="json")
        self.assertEqual(response.status_code, 201)
        return Wine.objects.get(pk=response.data["id"])

    def test_registration_creates_review_queue_without_merging_and_staff_only(self):
        source = self.register()
        candidate = WineDuplicateCandidate.objects.get(source=source, target=self.target)
        self.assertEqual(candidate.status, "pending")
        self.assertTrue(source.catalog_visible)
        self.assertIsNone(source.canonical_wine_id)
        self.assertEqual(self.member_client.get("/api/admin/duplicates/").status_code, 403)
        self.assertEqual(self.member_client.patch(
            f"/api/admin/duplicates/{candidate.pk}/", {"approved": True, "confirmTargetId": self.target.pk}, format="json",
        ).status_code, 403)
        listing = self.staff_client.get("/api/admin/duplicates/")
        self.assertEqual(listing.data["total"], 1)
        self.assertEqual(listing.data["results"][0]["target"]["imageUrl"], self.target.image_url)
        self.assertEqual(self.staff_client.get("/api/admin/duplicates/?countOnly=1").data["total"], 1)

    def test_admin_registration_uses_the_same_review_queue(self):
        response = self.staff_client.post("/api/admin/wines/", {
            "korName": "샤또 르 게이", "engName": "Chateau Le Gay", "type": "red", "country": "프랑스",
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(WineDuplicateCandidate.objects.filter(
            source_id=response.data["id"], target=self.target, status="pending",
        ).exists())

    def test_rejection_keeps_wines_separate_and_is_final(self):
        source = self.register()
        candidate = WineDuplicateCandidate.objects.get(source=source, target=self.target)
        url = f"/api/admin/duplicates/{candidate.pk}/"
        response = self.staff_client.patch(url, {"approved": False}, format="json")
        self.assertEqual(response.status_code, 200)
        source.refresh_from_db()
        self.assertTrue(source.catalog_visible)
        self.assertIsNone(source.canonical_wine_id)
        self.assertEqual(self.staff_client.patch(url, {"approved": True, "confirmTargetId": self.target.pk}, format="json").status_code, 409)

    def test_approval_requires_exact_target_and_preserves_reviews_images_and_favorites(self):
        source = self.register()
        candidate = WineDuplicateCandidate.objects.get(source=source, target=self.target)
        second_target = Wine.objects.create(kor_name="다른 와인", eng_name="Another Wine", type="red")
        sibling = WineDuplicateCandidate.objects.create(source=source, target=second_target, score=0.86)
        review = WineReview.objects.create(wine=source, user=self.member, text="내 기록", rating=40, is_public=False)
        review.likes.add(self.staff)
        image = WineReviewImage.objects.create(review=review, private_image="private/photo.jpg")
        self.member.favorite_wines.add(source, self.target)
        url = f"/api/admin/duplicates/{candidate.pk}/"

        self.assertEqual(self.staff_client.patch(url, {"approved": True, "confirmTargetId": second_target.pk}, format="json").status_code, 409)
        self.assertTrue(source.catalog_visible)
        response = self.staff_client.patch(url, {"approved": True, "confirmTargetId": self.target.pk}, format="json")
        self.assertEqual(response.status_code, 200)
        source.refresh_from_db()
        self.target.refresh_from_db()
        review.refresh_from_db()
        image.refresh_from_db()
        sibling.refresh_from_db()
        self.assertFalse(source.catalog_visible)
        self.assertEqual(source.canonical_wine_id, self.target.pk)
        self.assertEqual(review.wine_id, self.target.pk)
        self.assertTrue(review.likes.filter(pk=self.staff.pk).exists())
        self.assertEqual(image.review_id, review.pk)
        self.assertEqual(image.private_image.name, "private/photo.jpg")
        self.assertEqual(list(self.member.favorite_wines.values_list("id", flat=True)), [self.target.pk])
        self.assertIn(source.eng_name, self.target.search_aliases)
        self.assertEqual(sibling.status, "closed")
        self.assertEqual(self.staff_client.get("/api/admin/duplicates/").data["total"], 0)
        self.assertEqual(self.member_client.get(f"/api/wines/{source.pk}/").status_code, 200)

    def test_conflicting_metadata_prevents_merge(self):
        source = self.register(wineType="White")
        candidate = WineDuplicateCandidate.objects.get(source=source, target=self.target)
        response = self.staff_client.patch(
            f"/api/admin/duplicates/{candidate.pk}/",
            {"approved": True, "confirmTargetId": self.target.pk}, format="json",
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(WineDuplicateCandidate.objects.get(pk=candidate.pk).status, "pending")
        self.assertTrue(Wine.objects.get(pk=source.pk).catalog_visible)

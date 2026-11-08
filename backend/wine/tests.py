from importlib import import_module
from types import SimpleNamespace

from django.apps import apps
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import TestCase
from rest_framework.test import APIClient

from user.models import User
from wine.models import Tag, Wine, WineReview, WineReviewImage


class TobaccoTagMigrationTests(TestCase):
    def test_existing_reviews_keep_tobacco_aroma_when_tags_are_merged(self):
        user = User.objects.create_user(
            email="tobacco-migration@example.com", password="test-password", nickname="Reviewer",
        )
        wine = Wine.objects.create(kor_name="Test wine", eng_name="Test wine", type="red")
        reviews = [
            WineReview.objects.create(
                wine=wine, user=user, text="Review", rating=40,
                body=2, acidity=2, sweetness=2, tannin=2,
            )
            for _ in range(2)
        ]
        old_tag = Tag.objects.create(name="토바코", category="vegetal")
        new_tag = Tag.objects.get(name="담배향")
        reviews[0].tags.add(old_tag)
        reviews[1].tags.add(old_tag, new_tag)

        migration = import_module("wine.migrations.0008_merge_tobacco_tags")
        migration.merge_tobacco_tags(apps, SimpleNamespace(connection=connection))

        self.assertFalse(Tag.objects.filter(name="토바코").exists())
        for review in reviews:
            self.assertEqual(list(review.tags.values_list("name", flat=True)), ["담배향"])


class ReviewCoverImageTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="review-cover@example.com", password="test-password", nickname="Reviewer",
        )
        self.wine = Wine.objects.create(
            kor_name="커버 테스트", eng_name="Cover Test", type="red",
        )

    def add_review(self, *, is_public=True, image=None):
        review = WineReview.objects.create(
            wine=self.wine, user=self.user, text="Review", rating=40,
            body=2, acidity=2, sweetness=2, tannin=2, is_public=is_public,
        )
        if image:
            WineReviewImage.objects.create(review=review, image=f"review_images/{image}")
        return review

    def detail_image(self):
        response = self.client.get(f"/api/wines/{self.wine.id}/")
        self.assertEqual(response.status_code, 200)
        return response.data["imageUrl"]

    def test_public_review_cover_changes_with_visibility_and_existing_image_priority(self):
        self.add_review(is_public=False, image="private.jpg")
        self.add_review()
        first_photo = self.add_review(image="first.jpg")
        second_photo = self.add_review(image="second.jpg")

        self.assertTrue(self.detail_image().endswith("/media/review_images/first.jpg"))
        search = self.client.get("/api/wines/", {"q": "Cover Test"})
        self.assertEqual(search.status_code, 200)
        self.assertEqual(search.data["total"], 1)
        self.assertTrue(search.data["results"][0]["imageUrl"].endswith("/media/review_images/first.jpg"))

        self.user.is_staff = True
        self.user.save(update_fields=["is_staff"])
        admin_client = APIClient()
        admin_client.force_authenticate(user=self.user)
        admin_list = admin_client.get("/api/admin/wines/", {"q": "Cover Test"})
        self.assertEqual(admin_list.status_code, 200)
        self.assertTrue(admin_list.data["results"][0]["imageUrl"].endswith("/media/review_images/first.jpg"))
        admin_detail = admin_client.get(f"/api/admin/wines/{self.wine.id}/")
        self.assertEqual(admin_detail.status_code, 200)
        self.assertTrue(admin_detail.data["displayImageUrl"].endswith("/media/review_images/first.jpg"))
        self.assertIsNone(admin_detail.data["uploadedImageUrl"])

        first_photo.is_public = False
        first_photo.save(update_fields=["is_public"])
        self.assertTrue(self.detail_image().endswith("/media/review_images/second.jpg"))

        second_photo.delete()
        self.assertIsNone(self.detail_image())

        first_photo.is_public = True
        first_photo.save(update_fields=["is_public"])
        self.wine.image_url = "https://example.com/approved-wine.jpg"
        self.wine.save(update_fields=["image_url"])
        self.assertEqual(self.detail_image(), self.wine.image_url)

        self.wine.image = "wines/uploaded.jpg"
        self.wine.save(update_fields=["image"])
        self.assertTrue(self.detail_image().endswith("/media/wines/uploaded.jpg"))


class ReviewPrivacyAndWinePermissionTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com", password="test-password", nickname="Owner",
        )
        self.other = User.objects.create_user(
            email="other@example.com", password="test-password", nickname="Other",
        )
        self.staff = User.objects.create_user(
            email="staff@example.com", password="test-password", nickname="Staff",
            is_staff=True,
        )
        self.wine = Wine.objects.create(
            kor_name="등록 와인", eng_name="Registered Wine", type="red",
            registered_by=self.owner,
        )
        self.private_review = WineReview.objects.create(
            wine=self.wine, user=self.owner, text="비공개 기록", rating=40,
            body=2, acidity=2, sweetness=2, tannin=2, is_public=False,
        )
        self.public_review = WineReview.objects.create(
            wine=self.wine, user=self.owner, text="공개 기록", rating=35,
            body=2, acidity=2, sweetness=2, tannin=2, is_public=True,
        )
        self.owner_client = APIClient()
        self.owner_client.force_authenticate(user=self.owner)
        self.other_client = APIClient()
        self.other_client.force_authenticate(user=self.other)
        self.staff_client = APIClient()
        self.staff_client.force_authenticate(user=self.staff)

    def test_private_review_detail_is_only_visible_to_its_author(self):
        private_url = f"/api/reviews/{self.private_review.id}/"
        public_url = f"/api/reviews/{self.public_review.id}/"

        self.assertEqual(self.client.get(private_url).status_code, 404)
        self.assertEqual(self.other_client.get(private_url).status_code, 404)
        self.assertEqual(self.staff_client.get(private_url).status_code, 404)
        self.assertEqual(self.owner_client.get(private_url).status_code, 200)
        self.assertEqual(self.client.get(public_url).status_code, 200)

    def test_private_review_cannot_be_liked_or_changed_by_another_user(self):
        private_url = f"/api/reviews/{self.private_review.id}/"
        like_url = f"{private_url}like/"

        self.assertEqual(self.other_client.post(like_url).status_code, 404)
        self.assertEqual(self.owner_client.post(like_url).status_code, 404)
        self.assertEqual(self.other_client.patch(private_url, {"text": "changed"}).status_code, 404)
        self.assertEqual(self.other_client.delete(private_url).status_code, 404)
        self.private_review.refresh_from_db()
        self.assertEqual(self.private_review.text, "비공개 기록")
        self.assertEqual(self.private_review.likes.count(), 0)
        self.assertEqual(self.owner_client.patch(private_url, {"text": "수정한 기록"}).status_code, 200)
        self.assertEqual(self.owner_client.delete(private_url).status_code, 204)

    def test_private_review_rejects_publicly_stored_photos(self):
        response = self.owner_client.post("/api/reviews/", {
            "wine": self.wine.id,
            "rating": 4,
            "text": "사진을 포함한 비공개 기록",
            "body": 2,
            "acidity": 2,
            "sweetness": 2,
            "tannin": 2,
            "is_public": "false",
            "images": SimpleUploadedFile("private.jpg", b"image", content_type="image/jpeg"),
        }, format="multipart")
        self.assertEqual(response.status_code, 400)
        self.assertIn("images", response.data)
        self.assertEqual(WineReview.objects.count(), 2)

        WineReviewImage.objects.create(
            review=self.public_review, image="review_images/public.jpg",
        )
        public_url = f"/api/reviews/{self.public_review.id}/"
        response = self.owner_client.patch(public_url, {"is_public": False})
        self.assertEqual(response.status_code, 400)
        self.public_review.refresh_from_db()
        self.assertTrue(self.public_review.is_public)

    def test_wine_changes_require_owner_or_staff_and_deletion_requires_staff(self):
        wine_url = f"/api/wines/{self.wine.id}/"
        self.assertEqual(self.other_client.patch(wine_url, {"nameKr": "다른 이름"}).status_code, 403)
        self.assertEqual(self.other_client.delete(wine_url).status_code, 403)
        self.wine.refresh_from_db()
        self.assertEqual(self.wine.kor_name, "등록 와인")

        self.assertEqual(self.owner_client.patch(wine_url, {"nameKr": "수정한 이름"}).status_code, 200)
        self.assertEqual(self.owner_client.delete(wine_url).status_code, 403)
        self.assertEqual(self.staff_client.patch(wine_url, {"nameKr": "관리자 수정"}).status_code, 200)
        self.assertEqual(self.staff_client.delete(wine_url).status_code, 204)
        self.assertFalse(Wine.objects.filter(pk=self.wine.id).exists())

    def test_legacy_wine_id_does_not_grant_access_to_canonical_wine(self):
        legacy_wine = Wine.objects.create(
            kor_name="이전 와인", eng_name="Legacy Wine", type="red",
            registered_by=self.other, canonical_wine=self.wine, catalog_visible=False,
        )
        legacy_url = f"/api/wines/{legacy_wine.id}/"

        self.assertEqual(self.other_client.patch(legacy_url, {"nameKr": "변경 시도"}).status_code, 403)
        self.assertEqual(self.other_client.delete(legacy_url).status_code, 403)
        self.wine.refresh_from_db()
        self.assertEqual(self.wine.kor_name, "등록 와인")

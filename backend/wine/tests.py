from importlib import import_module
from io import BytesIO
from pathlib import Path
from tempfile import TemporaryDirectory
from time import time
from types import SimpleNamespace
from unittest.mock import patch

from django.apps import apps
from django.core.files.storage import FileSystemStorage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import connection
from django.test import TestCase
from rest_framework.test import APIClient
from PIL import Image

from user.models import User
from wine.models import Tag, Wine, WineReview, WineReviewImage


class OptionalReviewTasteTests(TestCase):
    def test_review_can_omit_taste_values_and_clear_them_later(self):
        user = User.objects.create_user(
            email="optional-taste@example.com", password="test-password", nickname="Reviewer",
        )
        wine = Wine.objects.create(kor_name="선택 기록 테스트", eng_name="Optional Taste", type="red")
        client = APIClient()
        client.force_authenticate(user=user)

        created = client.post("/api/reviews/", {
            "wine": wine.pk, "rating": 4.5, "text": "짧은 후기",
        }, format="json")
        self.assertEqual(created.status_code, 201)
        review = WineReview.objects.get(pk=created.data["id"])
        self.assertIsNone(review.body)
        self.assertIsNone(review.acidity)
        self.assertIsNone(review.sweetness)
        self.assertIsNone(review.tannin)
        self.assertIsNone(created.data["bodyRating"])
        self.assertIsNone(client.get(f"/api/wines/{wine.pk}/").data["avgBody"])

        updated = client.patch(f"/api/reviews/{review.pk}/", {"body": 3}, format="json")
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.data["bodyRating"], 3)
        cleared = client.patch(f"/api/reviews/{review.pk}/", {"body": None}, format="json")
        self.assertEqual(cleared.status_code, 200)
        self.assertIsNone(cleared.data["bodyRating"])


class HelpfulReviewOrderTests(TestCase):
    def test_wine_detail_shows_most_helpful_public_reviews_first(self):
        author = User.objects.create_user(email="helpful-author@example.com", password="test-password", nickname="Author")
        voters = [
            User.objects.create_user(email=f"helpful-voter-{i}@example.com", password="test-password", nickname=f"Voter {i}")
            for i in range(2)
        ]
        wine = Wine.objects.create(kor_name="도움 순서 테스트", eng_name="Helpful Order", type="red")
        reviews = [
            WineReview.objects.create(wine=wine, user=author, text=f"Review {i}", rating=40)
            for i in range(11)
        ]
        reviews[0].likes.add(*voters)
        reviews[1].likes.add(voters[0])
        private = WineReview.objects.create(
            wine=wine, user=author, text="Private", rating=40, is_public=False,
        )
        private.likes.add(*voters)

        detail = self.client.get(f"/api/wines/{wine.pk}/")
        self.assertEqual(detail.status_code, 200)
        detail_ids = [item["id"] for item in detail.data["reviews"]]
        self.assertEqual(detail_ids[:2], [reviews[0].id, reviews[1].id])
        self.assertEqual(len(detail_ids), 10)
        self.assertNotIn(private.id, detail_ids)

        popular = self.client.get("/api/reviews/", {"wine_id": wine.pk, "sort": "popular"})
        self.assertEqual(popular.status_code, 200)
        self.assertEqual([item["id"] for item in popular.data["results"][:2]], detail_ids[:2])


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

    def test_author_cannot_like_own_public_review(self):
        like_url = f"/api/reviews/{self.public_review.id}/like/"

        self.assertEqual(self.owner_client.post(like_url).status_code, 403)
        self.assertEqual(self.public_review.likes.count(), 0)

        self.assertEqual(self.other_client.post(like_url).status_code, 200)
        self.assertEqual(self.public_review.likes.count(), 1)
        self.assertEqual(self.other_client.post(like_url).status_code, 200)
        self.assertEqual(self.public_review.likes.count(), 0)

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


class PrivateReviewPhotoTests(TestCase):
    def setUp(self):
        self.temp_dir = TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        public_root = Path(self.temp_dir.name) / "public"
        private_root = Path(self.temp_dir.name) / "private"
        self.public_storage = FileSystemStorage(location=public_root, base_url="/media/")
        self.private_storage = FileSystemStorage(location=private_root, base_url="")
        for field_name, storage in (("image", self.public_storage), ("private_image", self.private_storage)):
            field = WineReviewImage._meta.get_field(field_name)
            patcher = patch.object(field, "storage", storage)
            patcher.start()
            self.addCleanup(patcher.stop)

        self.owner = User.objects.create_user(email="private-photo@example.com", password="test-password", nickname="Owner")
        self.other = User.objects.create_user(email="private-photo-other@example.com", password="test-password", nickname="Other")
        self.wine = Wine.objects.create(kor_name="비공개 사진 테스트", eng_name="Private Photo", type="red")
        self.owner_client = APIClient()
        self.owner_client.force_authenticate(user=self.owner)
        self.other_client = APIClient()
        self.other_client.force_authenticate(user=self.other)

    def photo(self, name="test-photo.jpg"):
        buffer = BytesIO()
        Image.new("RGB", (2, 2), "red").save(buffer, format="JPEG")
        return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/jpeg")

    def create_review(self, is_public):
        response = self.owner_client.post("/api/reviews/", {
            "wine": self.wine.pk, "rating": 4, "text": "사진 기록",
            "is_public": str(is_public).lower(), "images": self.photo(),
        }, format="multipart")
        self.assertEqual(response.status_code, 201, response.data)
        return response

    def test_private_photo_is_not_public_media_and_signed_link_expires(self):
        created = self.create_review(False)
        review_id = created.data["id"]
        photo = WineReviewImage.objects.get(review_id=review_id)
        self.assertFalse(photo.image)
        self.assertTrue(self.private_storage.exists(photo.private_image.name))
        url = created.data["images"][0]["url"]
        self.assertIn(f"/api/reviews/photos/{photo.pk}/?token=", url)

        self.assertEqual(self.other_client.get(f"/api/reviews/{review_id}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/reviews/{review_id}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/reviews/photos/{photo.pk}/").status_code, 404)
        self.assertEqual(self.client.get(url + "wrong").status_code, 404)
        image_response = self.client.get(url)
        self.assertEqual(image_response.status_code, 200)
        self.assertEqual(image_response["Cache-Control"], "private, no-store")
        self.assertTrue(b"".join(image_response.streaming_content).startswith(b"\xff\xd8"))
        with patch("django.core.signing.time.time", return_value=time() + 3700):
            self.assertEqual(self.client.get(url).status_code, 404)

        public_reviews = self.client.get("/api/reviews/")
        self.assertEqual(public_reviews.data["total"], 0)
        wine_detail = self.client.get(f"/api/wines/{self.wine.pk}/")
        self.assertEqual(wine_detail.data["reviews"], [])
        self.assertIsNone(wine_detail.data["imageUrl"])

    def test_public_photo_is_moved_when_review_becomes_private_and_back(self):
        created = self.create_review(True)
        review_id = created.data["id"]
        photo = WineReviewImage.objects.get(review_id=review_id)
        public_name = photo.image.name
        self.assertTrue(self.public_storage.exists(public_name))

        changed = self.owner_client.patch(f"/api/reviews/{review_id}/", {"is_public": False}, format="json")
        self.assertEqual(changed.status_code, 200, changed.data)
        photo.refresh_from_db()
        self.assertFalse(photo.image)
        self.assertFalse(self.public_storage.exists(public_name))
        self.assertTrue(self.private_storage.exists(photo.private_image.name))
        self.assertIn("/api/reviews/photos/", changed.data["images"][0]["url"])

        changed_back = self.owner_client.patch(f"/api/reviews/{review_id}/", {"is_public": True}, format="json")
        self.assertEqual(changed_back.status_code, 200, changed_back.data)
        photo.refresh_from_db()
        self.assertTrue(photo.image)
        self.assertFalse(photo.private_image)
        self.assertTrue(self.public_storage.exists(photo.image.name))
        self.assertTrue(changed_back.data["images"][0]["url"].endswith(photo.image.name))
        self.assertTrue(self.client.get(f"/api/wines/{self.wine.pk}/").data["imageUrl"].endswith(photo.image.name))

    def test_private_photo_can_be_added_and_removed_on_edit(self):
        created = self.create_review(False)
        review_id = created.data["id"]
        original = WineReviewImage.objects.get(review_id=review_id)
        original_name = original.private_image.name
        changed = self.owner_client.patch(f"/api/reviews/{review_id}/", {
            "is_public": "false", "images": self.photo("second-photo.jpg"), "remove_images": str(original.pk),
            "feels": "",
        }, format="multipart")
        self.assertEqual(changed.status_code, 200, changed.data)
        self.assertFalse(self.private_storage.exists(original_name))
        self.assertEqual(len(changed.data["images"]), 1)
        self.assertNotEqual(changed.data["images"][0]["id"], original.pk)

    def test_admin_can_open_private_photo_and_visibility_change_moves_file(self):
        created = self.create_review(True)
        review_id = created.data["id"]
        staff = User.objects.create_user(email="photo-staff@example.com", password="test-password", nickname="Staff", is_staff=True)
        admin_client = APIClient()
        admin_client.force_authenticate(user=staff)

        changed = admin_client.put(f"/api/admin/reviews/{review_id}/", {"isPublic": False}, format="json")
        self.assertEqual(changed.status_code, 200)
        photo = WineReviewImage.objects.get(review_id=review_id)
        self.assertFalse(photo.image)
        detail = admin_client.get(f"/api/admin/reviews/{review_id}/")
        self.assertEqual(detail.status_code, 200)
        image_response = self.client.get(detail.data["images"][0]["url"])
        self.assertEqual(image_response.status_code, 200)
        image_response.close()

    def test_deleting_private_review_deletes_photo_file(self):
        created = self.create_review(False)
        photo = WineReviewImage.objects.get(review_id=created.data["id"])
        private_name = photo.private_image.name
        link = created.data["images"][0]["url"]
        deleted = self.owner_client.delete(f"/api/reviews/{created.data['id']}/")
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(self.private_storage.exists(private_name))
        self.assertEqual(self.client.get(link).status_code, 404)

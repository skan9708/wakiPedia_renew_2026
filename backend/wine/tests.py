from django.test import TestCase
from rest_framework.test import APIClient

from user.models import User
from wine.models import Wine, WineReview, WineReviewImage


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

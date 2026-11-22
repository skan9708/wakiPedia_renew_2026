import io
import tempfile
from unittest.mock import Mock, patch

from django.core.files.base import ContentFile
from django.test import TestCase, override_settings
from PIL import Image, ImageDraw, ImageEnhance
from rest_framework.test import APIClient

from user.models import User
from wine.image_similarity import fingerprint, image_similarity, save_wine_fingerprint
from wine.models import Wine, WineDuplicateCandidate, WineReview, WineReviewImage


def photo_bytes(*, different=False):
    image = Image.new("RGB", (300, 420), "#e4d6b8" if not different else "#193654")
    draw = ImageDraw.Draw(image)
    draw.rectangle((55, 15, 245, 405), fill="#4e2729" if not different else "#3faea1")
    draw.rectangle((65, 140, 235, 305), fill="white" if not different else "#eda837")
    for index in range(5):
        draw.line((80, 165 + index * 25, 215, 165 + index * 25), fill="black" if not different else "#2670aa", width=4)
    output = io.BytesIO()
    image.save(output, format="JPEG", quality=85)
    return output.getvalue()


class WineImageSimilarityTests(TestCase):
    def setUp(self):
        self.media = tempfile.TemporaryDirectory()
        self.addCleanup(self.media.cleanup)
        settings_override = override_settings(MEDIA_ROOT=self.media.name)
        settings_override.enable()
        self.addCleanup(settings_override.disable)
        self.member = User.objects.create_user(email="photo-member@example.com", password="test-password", nickname="Photo")
        self.staff = User.objects.create_user(email="photo-staff@example.com", password="test-password", nickname="Staff", is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.member)

    def test_hash_recognizes_same_photo_but_rejects_different_photo(self):
        hashes = fingerprint(io.BytesIO(photo_bytes()))
        other = fingerprint(io.BytesIO(photo_bytes(different=True)))
        source = Wine(image_hash=hashes[0], image_crop_hash=hashes[1], image_color=hashes[2])
        self.assertEqual(image_similarity(source, source), 1)
        brighter = ImageEnhance.Brightness(Image.open(io.BytesIO(photo_bytes()))).enhance(1.1)
        resized = brighter.resize((240, 336))
        output = io.BytesIO()
        resized.save(output, format="JPEG", quality=60)
        near = fingerprint(io.BytesIO(output.getvalue()))
        self.assertIsNotNone(image_similarity(source, Wine(image_hash=near[0], image_crop_hash=near[1], image_color=near[2])))
        self.assertIsNone(image_similarity(source, Wine(image_hash=other[0], image_crop_hash=other[1], image_color=other[2])))

    @override_settings(AWS_S3_CUSTOM_DOMAIN="wakipedia-media.s3.ap-northeast-2.amazonaws.com")
    @patch("wine.image_similarity.requests.get")
    def test_existing_catalog_url_can_be_indexed_from_trusted_storage(self, get):
        response = Mock(status_code=200, headers={"Content-Type": "image/jpeg"})
        response.iter_content.return_value = [photo_bytes()]
        get.return_value = response
        wine = Wine.objects.create(
            kor_name="기존 사진", eng_name="Catalog Photo", type="red",
            image_url="https://wakipedia-media.s3.ap-northeast-2.amazonaws.com/wines/old.jpg",
        )
        self.assertTrue(save_wine_fingerprint(wine, include_remote=True))
        self.assertTrue(Wine.objects.get(pk=wine.pk).image_hash)
        get.assert_called_once()

    @override_settings(AWS_S3_CUSTOM_DOMAIN="wakipedia-media.s3.ap-northeast-2.amazonaws.com")
    @patch("wine.image_similarity.requests.get")
    def test_admin_photo_change_replaces_stale_fingerprint(self, get):
        wine = Wine.objects.create(kor_name="사진 교체", eng_name="Changed Photo", type="red")
        old_hash = fingerprint(io.BytesIO(photo_bytes()))
        Wine.objects.filter(pk=wine.pk).update(
            image_hash=old_hash[0], image_crop_hash=old_hash[1], image_color=old_hash[2],
        )
        response = Mock(status_code=200, headers={"Content-Type": "image/jpeg"})
        response.iter_content.return_value = [photo_bytes(different=True)]
        get.return_value = response
        staff_client = APIClient()
        staff_client.force_authenticate(user=self.staff)
        result = staff_client.put(f"/api/admin/wines/{wine.pk}/", {
            "imageUrl": "https://wakipedia-media.s3.ap-northeast-2.amazonaws.com/wines/replaced.jpg",
        }, format="json")
        self.assertEqual(result.status_code, 200)
        wine.refresh_from_db()
        self.assertNotEqual(wine.image_hash, old_hash[0])

    def test_photo_only_match_enters_admin_queue_without_merging(self):
        target = Wine.objects.create(kor_name="기존 이름", eng_name="Original Bottle", type="red")
        target.image.save("target.jpg", ContentFile(photo_bytes()), save=True)
        self.assertTrue(save_wine_fingerprint(target))

        from django.core.files.uploadedfile import SimpleUploadedFile
        response = self.client.post("/api/wines/", {
            "nameKr": "전혀 다른 표기", "nameEng": "Completely Different Label", "wineType": "Red",
            "image": SimpleUploadedFile("new.jpg", photo_bytes(), content_type="image/jpeg"),
        }, format="multipart")
        self.assertEqual(response.status_code, 201)
        source = Wine.objects.get(pk=response.data["id"])
        candidate = WineDuplicateCandidate.objects.get(source=source, target=target)
        self.assertEqual(candidate.image_score, 1)
        self.assertEqual(candidate.status, "pending")
        self.assertTrue(source.catalog_visible)
        self.assertIsNone(source.canonical_wine_id)

        staff_client = APIClient()
        staff_client.force_authenticate(user=self.staff)
        result = staff_client.get("/api/admin/duplicates/").data["results"][0]
        self.assertEqual(result["imageScore"], 1)
        self.assertEqual(result["nameScore"], 0)

    def test_private_review_photo_never_becomes_catalog_fingerprint(self):
        wine = Wine.objects.create(kor_name="비공개 와인", eng_name="Private Wine", type="red")
        review = WineReview.objects.create(wine=wine, user=self.member, text="메모", rating=40, is_public=False)
        WineReviewImage.objects.create(review=review, private_image="private/secret.jpg")
        self.assertFalse(save_wine_fingerprint(wine))
        wine.refresh_from_db()
        self.assertEqual(wine.image_hash, "")

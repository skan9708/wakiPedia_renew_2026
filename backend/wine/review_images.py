"""Private review photo links and safe public-to-private transitions."""

from mimetypes import guess_type
from pathlib import PurePath
from urllib.parse import urlencode

from django.core import signing
from django.core.files import File
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.urls import reverse
from rest_framework.permissions import AllowAny
from rest_framework import serializers
from rest_framework.views import APIView

from wine.models import WineReviewImage


PHOTO_LINK_SALT = "private-review-photo"
PHOTO_LINK_MAX_AGE = 60 * 60
SAFE_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/bmp", "image/tiff"}


def validate_review_photos(files):
    image_field = serializers.ImageField(allow_empty_file=False)
    for image in files:
        image_field.run_validation(image)


def private_photo_url(photo, request=None):
    token = signing.dumps(
        {"image": photo.pk, "review": photo.review_id, "owner": photo.review.user_id},
        salt=PHOTO_LINK_SALT,
    )
    path = reverse("private-review-photo", args=[photo.pk])
    url = f"{path}?{urlencode({'token': token})}"
    return request.build_absolute_uri(url) if request else url


def review_image_url(photo, request=None):
    if photo.image:
        url = photo.image.url
        return request.build_absolute_uri(url) if request else url
    if photo.private_image:
        return private_photo_url(photo, request)
    return None


def protect_review_images(review):
    """Remove publicly readable originals before changing a review to private."""
    public_photos = list(review.images.exclude(image=""))
    for photo in public_photos:
        if WineReviewImage.objects.filter(image=photo.image.name).exclude(pk=photo.pk).exists():
            raise serializers.ValidationError({
                "images": "다른 리뷰와 사진 파일을 공유하고 있어 비공개로 변경할 수 없습니다."
            })
    for photo in public_photos:
        public_name = photo.image.name
        if not photo.private_image:
            with photo.image.open("rb") as source:
                photo.private_image.save(PurePath(public_name).name, File(source), save=True)
        photo.image.storage.delete(public_name)
        photo.image = ""
        photo.save(update_fields=["image"])


def publish_review_images(review):
    """Make photos from a newly public review available as normal public media."""
    for photo in review.images.exclude(private_image="").exclude(private_image__isnull=True):
        private_name = photo.private_image.name
        if not photo.image:
            with photo.private_image.open("rb") as source:
                photo.image.save(PurePath(private_name).name, File(source), save=True)
        photo.private_image.storage.delete(private_name)
        photo.private_image = None
        photo.save(update_fields=["private_image"])


class PrivateReviewPhotoView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, pk):
        token = request.query_params.get("token", "")
        try:
            payload = signing.loads(token, salt=PHOTO_LINK_SALT, max_age=PHOTO_LINK_MAX_AGE)
        except (signing.BadSignature, signing.SignatureExpired):
            raise Http404

        photo = get_object_or_404(
            WineReviewImage.objects.select_related("review"), pk=pk,
        )
        if payload != {"image": photo.pk, "review": photo.review_id, "owner": photo.review.user_id}:
            raise Http404
        if not photo.private_image:
            raise Http404

        try:
            image_file = photo.private_image.open("rb")
        except (FileNotFoundError, OSError):
            raise Http404
        guessed_type = guess_type(photo.private_image.name)[0]
        mime_type = guessed_type if guessed_type in SAFE_IMAGE_TYPES else "application/octet-stream"
        response = FileResponse(image_file, content_type=mime_type)
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        response["X-Robots-Tag"] = "noindex"
        return response

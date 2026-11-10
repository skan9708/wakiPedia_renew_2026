"""Keep private review photos outside the publicly served media prefix."""

from django.conf import settings
from django.core.files.storage import FileSystemStorage


def private_review_image_storage():
    if settings.AWS_STORAGE_BUCKET_NAME:
        from storages.backends.s3 import S3Storage

        return S3Storage(
            bucket_name=settings.AWS_STORAGE_BUCKET_NAME,
            location="private/review_images",
            default_acl="private",
            querystring_auth=True,
            file_overwrite=False,
        )
    return FileSystemStorage(location=settings.PRIVATE_MEDIA_ROOT, base_url="")

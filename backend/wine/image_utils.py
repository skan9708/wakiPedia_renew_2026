"""Choose the image shown for a wine without copying a reviewer's photo."""

from wine.models import WineReviewImage


def public_review_image_names(wine_id):
    """Image from the earliest public review with a photo, in a stable order."""
    return (
        WineReviewImage.objects.filter(review__wine_id=wine_id, review__is_public=True)
        .exclude(image="")
        .order_by("review__created_at", "review_id", "created_at", "id")
        .values_list("image", flat=True)
    )


def wine_display_image_url(wine, request=None):
    if wine.image:
        url = wine.image.url
    elif wine.image_url:
        return wine.image_url
    else:
        cover = getattr(wine, "review_cover_image", None)
        if not hasattr(wine, "review_cover_image"):
            cover = public_review_image_names(wine.pk).first()
        if not cover:
            return None
        url = WineReviewImage._meta.get_field("image").storage.url(cover)
    return request.build_absolute_uri(url) if request else url

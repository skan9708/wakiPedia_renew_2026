from django.db.models.signals import post_delete
from django.dispatch import receiver

from wine.models import WineReviewImage


@receiver(post_delete, sender=WineReviewImage)
def delete_review_photo_files(sender, instance, **kwargs):
    if instance.private_image:
        instance.private_image.delete(save=False)

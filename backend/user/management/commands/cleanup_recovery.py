from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from user.models import PhoneChallenge, RecoveryRequest, SignupEmailChallenge


class Command(BaseCommand):
    help = "Delete expired account recovery records (run daily)."

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=29)
        challenges, _ = PhoneChallenge.objects.filter(created_at__lt=cutoff).delete()
        email_challenges, _ = SignupEmailChallenge.objects.filter(created_at__lt=cutoff).delete()
        attempts, _ = RecoveryRequest.objects.filter(created_at__lt=cutoff).delete()
        self.stdout.write(f"Deleted {challenges} phone challenges, {email_challenges} email challenges and {attempts} recovery attempts.")

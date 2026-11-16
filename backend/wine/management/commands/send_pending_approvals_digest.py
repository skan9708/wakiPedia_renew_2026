"""Send one evening email with the current administrator approval backlog."""

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from user.models import User
from user.recovery import DeliveryError, send_account_email
from wine.models import Country, GrapeVariety, WineDuplicateCandidate


def pending_counts():
    return {
        "duplicates": WineDuplicateCandidate.objects.filter(status="pending").count(),
        "countries": Country.objects.filter(is_approved=False).count(),
        "grapes": GrapeVariety.objects.filter(is_approved=False).count(),
    }


def digest_recipients():
    configured = getattr(settings, "ADMIN_DIGEST_EMAILS", [])
    if configured:
        return list(dict.fromkeys(configured))
    return list(User.objects.filter(is_staff=True, is_active=True, is_import_account=False)
                .exclude(email="").values_list("email", flat=True))


def digest_body(counts):
    base = settings.PUBLIC_SITE_URL
    return (
        "와키피디아 관리자 승인 대기 현황입니다.\n\n"
        f"중복 의심 와인: {counts['duplicates']}건\n"
        f"새 원산지: {counts['countries']}건\n"
        f"새 품종: {counts['grapes']}건\n\n"
        f"중복 의심 와인 확인: {base}/admin-panel/duplicates\n"
        f"원산지·품종 확인: {base}/admin-panel/catalog-terms\n\n"
        "와인 이름의 확실한 오타와 빈티지 연도는 등록 전에 자동 보정됩니다. "
        "중복 여부는 관리자가 직접 판단해 주세요.\n"
    )


class Command(BaseCommand):
    help = "Email pending duplicate and catalog-term approvals to active administrators."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show counts without sending email")

    def handle(self, *args, **options):
        counts = pending_counts()
        total = sum(counts.values())
        self.stdout.write(f"Pending: duplicates={counts['duplicates']}, countries={counts['countries']}, grapes={counts['grapes']}")
        if not total:
            self.stdout.write("Nothing pending; no email sent.")
            return
        recipients = digest_recipients()
        if not recipients:
            raise CommandError("No active administrator email recipient is configured.")
        if options["dry_run"]:
            self.stdout.write(f"Dry run; {len(recipients)} recipient(s), no email sent.")
            return
        if not settings.EMAIL_RECOVERY_ENABLED:
            raise CommandError("Email delivery is not configured; set SES or SMTP before enabling the timer.")
        body = digest_body(counts)
        failures = 0
        for recipient in recipients:
            try:
                send_account_email(recipient, f"[와키피디아] 관리자 승인 대기 {total}건", body)
            except DeliveryError:
                failures += 1
        if failures:
            raise CommandError(f"Email delivery failed for {failures} of {len(recipients)} recipient(s).")
        self.stdout.write(f"Sent to {len(recipients)} administrator(s).")

"""Index existing public catalog photos for duplicate review."""

from django.core.management.base import BaseCommand

from wine.image_similarity import save_wine_fingerprint
from wine.models import Wine
from wine.suggestions import queue_duplicate_candidates


class Command(BaseCommand):
    help = "Fingerprint public wine photos and optionally queue existing user wines for duplicate review."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=0, help="Maximum wines to attempt (0: all)")
        parser.add_argument("--start-id", type=int, default=0, help="Resume after this wine ID")
        parser.add_argument("--refresh", action="store_true", help="Recompute existing fingerprints")
        parser.add_argument("--queue-existing", action="store_true", help="Rescan user-registered wines after backfill")
        parser.add_argument("--local-only", action="store_true", help="Skip catalog URLs in remote storage")

    def handle(self, *args, **options):
        if options["limit"] < 0:
            raise ValueError("--limit must be non-negative")
        qs = Wine.objects.filter(catalog_visible=True, pk__gt=options["start_id"]).order_by("pk")
        if not options["refresh"]:
            qs = qs.filter(image_hash="")
        attempted = indexed = last_id = 0
        for wine in qs.iterator(chunk_size=100):
            if options["limit"] and attempted >= options["limit"]:
                break
            attempted += 1
            last_id = wine.pk
            if save_wine_fingerprint(
                wine, include_remote=not options["local_only"], refresh=options["refresh"],
            ):
                indexed += 1
            if attempted % 100 == 0:
                self.stdout.write(f"Processed {attempted}, indexed {indexed}, last ID {last_id}")
        self.stdout.write(self.style.SUCCESS(f"Processed {attempted}, indexed {indexed}, last ID {last_id}"))
        if options["queue_existing"]:
            rescanned = 0
            for wine in Wine.objects.filter(catalog_visible=True, registered_by__isnull=False).exclude(image_hash="").iterator(chunk_size=100):
                queue_duplicate_candidates(wine)
                rescanned += 1
            self.stdout.write(self.style.SUCCESS(f"Rescanned {rescanned} user-registered wines"))

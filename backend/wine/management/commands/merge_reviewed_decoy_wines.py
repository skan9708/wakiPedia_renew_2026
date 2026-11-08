"""Merge the two Decoy pairs verified from their bottle and review photos."""

import json
import sqlite3
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from user.models import User
from wine.models import Wine, WineReview


# The Merlot bottles both read "DECOY MERLOT 2019". Wine 8010's bottle reads
# "DECOY CABERNET SAUVIGNON 2019"; a review photo for 8437 shows the same
# named wine from 2023. This catalog does not split wines by vintage.
MERGES = (
    (5803, 4816, "Decoy sonoma county Merlot", "Duckhorn Decoy Merlot"),
    (8010, 8437, "decoy", "Decoy Cabernet Sauvignon"),
)


class Command(BaseCommand):
    help = "Preview or apply the photo-verified Decoy Merlot and Cabernet merges."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--backup-path")

    def handle(self, *args, **options):
        if options["apply"] and not options["backup_path"]:
            raise CommandError("--apply requires --backup-path.")

        ids = {wine_id for source, target, _, _ in MERGES for wine_id in (source, target)}
        wines = Wine.objects.in_bulk(ids)
        if set(wines) != ids:
            raise CommandError("A reviewed Decoy source or representative is missing.")

        pending = []
        summary = []
        favorites = User.favorite_wines.through
        for source_id, target_id, source_name, target_name in MERGES:
            source, target = wines[source_id], wines[target_id]
            if source.eng_name.casefold() != source_name.casefold():
                raise CommandError(f"Source {source_id} has an unexpected name.")
            allowed_names = {target_name.casefold()}
            if target_id == 4816:
                allowed_names.add("decoy merlot")
            if target.eng_name.casefold() not in allowed_names:
                raise CommandError(f"Representative {target_id} has an unexpected name.")
            if not target.catalog_visible or target.canonical_wine_id is not None:
                raise CommandError(f"Representative {target_id} is not active.")
            if source.type != target.type or source.country_id != target.country_id:
                raise CommandError(f"Wine details conflict for {source_id}:{target_id}.")
            source_grapes = set(source.grape_varieties.values_list("id", flat=True))
            target_grapes = set(target.grape_varieties.values_list("id", flat=True))
            if not source_grapes.issubset(target_grapes):
                raise CommandError(f"Grapes conflict for {source_id}:{target_id}.")

            descendants = list(Wine.objects.filter(canonical_wine_id=source_id))
            if any(item.catalog_visible for item in descendants):
                raise CommandError(f"An archived wine of {source_id} is visible.")
            move_ids = [source_id, *(item.id for item in descendants)]
            review_count = WineReview.objects.filter(wine_id__in=move_ids).count()
            favorite_count = favorites.objects.filter(wine_id__in=move_ids).count()
            already_merged = not source.catalog_visible and source.canonical_wine_id == target_id
            if already_merged:
                if descendants or review_count or favorite_count:
                    raise CommandError(f"Merge {source_id}:{target_id} is only partly applied.")
            elif not source.catalog_visible or source.canonical_wine_id is not None:
                raise CommandError(f"Source {source_id} is not an active representative.")
            else:
                pending.append((source_id, target_id))
            summary.append({
                "source": source_id, "target": target_id,
                "reviews_to_move": review_count,
                "favorites_to_move": favorite_count,
                "archived_ids_to_redirect": len(descendants),
                "already_merged": already_merged,
            })

        self.stdout.write(json.dumps(summary, ensure_ascii=False))
        if not options["apply"]:
            self.stdout.write("DRY RUN: no database changes")
            return
        if not pending:
            self.stdout.write("Already applied: no database changes")
            return

        self._backup(options["backup_path"])
        original_review_count = WineReview.objects.count()
        with transaction.atomic():
            for source_id, target_id in pending:
                source = Wine.objects.get(pk=source_id)
                target = Wine.objects.get(pk=target_id)
                descendant_ids = list(Wine.objects.filter(canonical_wine_id=source_id).values_list("id", flat=True))
                move_ids = [source_id, *descendant_ids]

                WineReview.objects.filter(wine_id__in=move_ids).update(wine_id=target_id)
                users = list(favorites.objects.filter(wine_id__in=move_ids).values_list("user_id", flat=True).distinct())
                favorites.objects.bulk_create(
                    [favorites(user_id=user_id, wine_id=target_id) for user_id in users],
                    ignore_conflicts=True,
                )
                favorites.objects.filter(wine_id__in=move_ids).delete()

                aliases = target.search_aliases
                for name in (target.eng_name, target.kor_name, source.eng_name, source.kor_name, source.search_aliases):
                    if name and name.casefold() not in aliases.casefold():
                        aliases = f"{aliases}, {name}" if aliases else name
                target.search_aliases = aliases
                if target_id == 4816:
                    target.eng_name = "Decoy Merlot"
                    target.kor_name = "디코이 메를로"
                if not target.image and not target.image_url:
                    target.image = source.image
                    target.image_url = source.image_url
                target.save(update_fields=["search_aliases", "eng_name", "kor_name", "image", "image_url", "updated_at"])

                Wine.objects.filter(canonical_wine_id=source_id).update(canonical_wine_id=target_id)
                source.catalog_visible = False
                source.canonical_wine_id = target_id
                source.save(update_fields=["catalog_visible", "canonical_wine", "updated_at"])

                if WineReview.objects.filter(wine_id__in=move_ids).exists():
                    raise CommandError(f"Reviews still point to merged wine {source_id}.")
            if WineReview.objects.count() != original_review_count:
                raise CommandError("Review count changed; rolling back.")
        self.stdout.write(self.style.SUCCESS("APPLIED: reviewed Decoy pairs merged"))

    def _backup(self, destination):
        if connection.vendor != "sqlite":
            raise CommandError("Automatic backup currently supports SQLite only.")
        source = Path(connection.settings_dict["NAME"]).resolve()
        target = Path(destination).expanduser().resolve()
        if not target.parent.is_dir() or target.exists() or target == source:
            raise CommandError("Backup path must be a new file in an existing directory.")
        with sqlite3.connect(source) as src, sqlite3.connect(target) as dst:
            src.backup(dst)
        self.stdout.write("BACKUP: " + str(target))

"""Apply the 2026-11-08 reviewed catalog merges."""

import json
import sqlite3
import unicodedata
from contextlib import closing
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from user.models import User
from wine.models import Wine, WineReview, WineReviewImage
from wine.photo_metadata_exceptions import PHOTO_METADATA_EXCEPTIONS
from wine.verified_catalog_merges import (
    CANONICAL_ENGLISH_NAMES,
    CANONICAL_KOREAN_NAMES,
    EXCLUDE_SOURCE_ALIASES,
    VERIFIED_CATALOG_MERGES,
)


# Source 5953 has a Colore photo despite its Testamatta name and reviews.
# Preserve the correctly photographed representative 9105.
EXPECTED_REPRESENTATIVE_IMAGE_URLS = {
    9105: "https://wakipedia-media.s3.ap-northeast-2.amazonaws.com/media/wines/bubble/f1745496103202x582497231354581800.png",
}


def normalized_name(value):
    return "".join(
        char for char in unicodedata.normalize("NFKC", value or "").casefold()
        if char.isalnum()
    )


# A previous merge added a source name that its bottle label disproves.
INCORRECT_EXISTING_ALIASES = {
    4821: {"Bread & Butter Napa Pinot Noir", "브레드 앤 버터 나파 피노누아"},
}


def remove_incorrect_aliases(aliases, incorrect):
    incorrect_keys = {name.casefold() for name in incorrect}
    return ", ".join(
        name.strip() for name in aliases.split(",")
        if name.strip() and name.strip().casefold() not in incorrect_keys
    )


class Command(BaseCommand):
    help = "Preview or apply reviewed source-to-representative catalog merges."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--backup-path")

    def handle(self, *args, **options):
        if options["apply"] and not options["backup_path"]:
            raise CommandError("--apply requires --backup-path.")

        planned_targets = {source: target for source, target, _, _ in VERIFIED_CATALOG_MERGES}
        if len(planned_targets) != len(VERIFIED_CATALOG_MERGES):
            raise CommandError("A verified source appears more than once.")
        if any(source == target or target in planned_targets for source, target in planned_targets.items()):
            raise CommandError("Verified merges must point directly to an unmerged representative.")

        ids = {wine_id for source, target, _, _ in VERIFIED_CATALOG_MERGES for wine_id in (source, target)}
        wines = Wine.objects.in_bulk(ids)
        if set(wines) != ids:
            raise CommandError("A verified source or representative is missing.")
        alias_cleanup = {
            wine_id: remove_incorrect_aliases(wines[wine_id].search_aliases, incorrect)
            for wine_id, incorrect in INCORRECT_EXISTING_ALIASES.items()
            if wine_id in wines
            if remove_incorrect_aliases(wines[wine_id].search_aliases, incorrect)
            != wines[wine_id].search_aliases
        }

        def current_root(source):
            seen = set()
            current = source
            while current.canonical_wine_id is not None:
                if current.id in seen:
                    raise CommandError(f"Canonical redirect cycle at wine {source.id}.")
                seen.add(current.id)
                current = Wine.objects.filter(pk=current.canonical_wine_id).first()
                if current is None:
                    raise CommandError(f"Broken canonical redirect at wine {source.id}.")
            return current

        favorites = User.favorite_wines.through
        pending = []
        summary = []
        for source_id, target_id, source_name, target_name in VERIFIED_CATALOG_MERGES:
            source, target = wines[source_id], wines[target_id]
            if normalized_name(source.eng_name) != normalized_name(source_name):
                raise CommandError(f"Source {source_id} has an unexpected name.")
            allowed_target_names = {normalized_name(target_name)}
            if target_id in CANONICAL_ENGLISH_NAMES:
                allowed_target_names.add(normalized_name(CANONICAL_ENGLISH_NAMES[target_id]))
            if normalized_name(target.eng_name) not in allowed_target_names:
                raise CommandError(f"Representative {target_id} has an unexpected name.")
            if not target.catalog_visible or target.canonical_wine_id is not None:
                raise CommandError(f"Representative {target_id} is not active.")
            expected_image_url = EXPECTED_REPRESENTATIVE_IMAGE_URLS.get(target_id)
            if expected_image_url and target.image_url != expected_image_url:
                raise CommandError(f"Representative {target_id} has an unexpected image URL.")
            source_grapes = set(source.grape_varieties.values_list("id", flat=True))
            target_grapes = set(target.grape_varieties.values_list("id", flat=True))
            if source_id in PHOTO_METADATA_EXCEPTIONS:
                source_details = {
                    "name": source.eng_name, "type": source.type,
                    "country": source.country.kor_name if source.country else None,
                    "image_url": source.image_url,
                }
                target_details = {
                    "name": target.eng_name, "type": target.type,
                    "country": target.country.kor_name if target.country else None,
                    "image_url": target.image_url,
                }
                source_grape_names = set(source.grape_varieties.values_list("kor_name", flat=True))
                target_grape_names = set(target.grape_varieties.values_list("kor_name", flat=True))
                if not PHOTO_METADATA_EXCEPTIONS[source_id](
                    source_id, target_id, source_details, target_details,
                    source_grape_names, target_grape_names,
                ):
                    raise CommandError(f"Unexpected metadata for photographed wine {source_id}:{target_id}.")
            else:
                if source.type != target.type or source.country_id != target.country_id:
                    raise CommandError(f"Wine details conflict for {source_id}:{target_id}.")
                if source_grapes and target_grapes and not source_grapes & target_grapes:
                    raise CommandError(f"Grapes conflict for {source_id}:{target_id}.")

            descendants = list(Wine.objects.filter(canonical_wine_id=source_id))
            if any(item.catalog_visible for item in descendants):
                raise CommandError(f"A descendant of {source_id} is visible.")
            if any(
                descendant.id in planned_targets and planned_targets[descendant.id] != target_id
                for descendant in descendants
            ):
                raise CommandError(f"A descendant of {source_id} has a conflicting representative.")
            move_ids = [source_id, *(item.id for item in descendants)]
            review_count = WineReview.objects.filter(wine_id__in=move_ids).count()
            favorite_count = favorites.objects.filter(wine_id__in=move_ids).count()
            if source.catalog_visible:
                if source.canonical_wine_id is not None:
                    raise CommandError(f"Visible source {source_id} has a canonical redirect.")
            else:
                root = current_root(source)
                if root.id != target_id and planned_targets.get(root.id) != target_id:
                    raise CommandError(
                        f"Archived source {source_id} redirects outside its verified merge group."
                    )
            already_merged = (
                not source.catalog_visible and source.canonical_wine_id == target_id
                and not descendants and not review_count and not favorite_count
            )
            if not already_merged:
                pending.append((source_id, target_id, source.catalog_visible))
            summary.append({
                "source": source_id, "target": target_id,
                "reviews_to_move": review_count,
                "favorites_to_move": favorite_count,
                "archived_ids_to_redirect": len(descendants),
                "already_merged": already_merged,
            })

        self.stdout.write(json.dumps(summary, ensure_ascii=False))
        self.stdout.write(json.dumps({"alias_cleanup_ids": sorted(alias_cleanup)}))
        if not options["apply"]:
            self.stdout.write("DRY RUN: no database changes")
            return
        if not pending and not alias_cleanup:
            self.stdout.write("Already applied: no database changes")
            return

        self._backup(options["backup_path"])
        original_review_count = WineReview.objects.count()
        original_review_image_count = WineReviewImage.objects.count()
        original_visible_count = Wine.objects.filter(catalog_visible=True).count()
        with transaction.atomic():
            for source_id, target_id, _ in pending:
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
                names = [target.eng_name, target.kor_name]
                if source_id not in EXCLUDE_SOURCE_ALIASES:
                    names.extend((source.eng_name, source.kor_name, source.search_aliases))
                for name in names:
                    if name and name.casefold() not in aliases.casefold():
                        aliases = f"{aliases}, {name}" if aliases else name
                target.search_aliases = aliases
                if target_id in CANONICAL_ENGLISH_NAMES:
                    target.eng_name = CANONICAL_ENGLISH_NAMES[target_id]
                if target_id in CANONICAL_KOREAN_NAMES:
                    target.kor_name = CANONICAL_KOREAN_NAMES[target_id]
                if not target.image and not target.image_url:
                    target.image = source.image
                    target.image_url = source.image_url
                target.save(update_fields=[
                    "search_aliases", "eng_name", "kor_name", "image", "image_url", "updated_at",
                ])
                if not target.grape_varieties.exists():
                    target.grape_varieties.set(source.grape_varieties.all())

                Wine.objects.filter(canonical_wine_id=source_id).update(canonical_wine_id=target_id)
                source.catalog_visible = False
                source.canonical_wine_id = target_id
                source.save(update_fields=["catalog_visible", "canonical_wine", "updated_at"])

                if WineReview.objects.filter(wine_id__in=move_ids).exists():
                    raise CommandError(f"Reviews still point to merged wine {source_id}.")

            for wine_id, incorrect in INCORRECT_EXISTING_ALIASES.items():
                if wine_id not in wines:
                    continue
                target = Wine.objects.get(pk=wine_id)
                cleaned = remove_incorrect_aliases(target.search_aliases, incorrect)
                if cleaned != target.search_aliases:
                    target.search_aliases = cleaned
                    target.save(update_fields=["search_aliases", "updated_at"])

            if WineReview.objects.count() != original_review_count:
                raise CommandError("Review count changed; rolling back.")
            if WineReviewImage.objects.count() != original_review_image_count:
                raise CommandError("Review image count changed; rolling back.")
            active_sources = sum(was_visible for _, _, was_visible in pending)
            if Wine.objects.filter(catalog_visible=True).count() != original_visible_count - active_sources:
                raise CommandError("Visible wine count changed unexpectedly; rolling back.")
        self.stdout.write(self.style.SUCCESS("APPLIED: reviewed catalog merges"))

    def _backup(self, destination):
        if connection.vendor != "sqlite":
            raise CommandError("Automatic backup currently supports SQLite only.")
        source = Path(connection.settings_dict["NAME"]).resolve()
        target = Path(destination).expanduser().resolve()
        if not target.parent.is_dir() or target.exists() or target == source:
            raise CommandError("Backup path must be a new file in an existing directory.")
        with closing(sqlite3.connect(source)) as src, closing(sqlite3.connect(target)) as dst:
            src.backup(dst)
        target.chmod(0o600)
        self.stdout.write("BACKUP: " + str(target))

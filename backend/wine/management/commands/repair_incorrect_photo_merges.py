"""Undo two mistaken bottle merges using their original database backup."""

import json
import sqlite3
from contextlib import closing
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from user.models import User
from wine.management.commands.merge_verified_catalog_wines import normalized_name
from wine.models import GrapeVariety, Wine, WineReview, WineReviewImage
from wine.verified_catalog_merges import CANONICAL_ENGLISH_NAMES, CANONICAL_KOREAN_NAMES


# (source, mistaken target, correct target, original review IDs, expected source name)
# A source listed as its own correct target must be restored as a visible wine.
REPAIRS = (
    (5777, 8369, 5777, (987,), "Federico Paternina Cava"),
    (5658, 5368, 5658, (863,), "penfolds koonunga hill shiraz"),
)

CORRECTED_SOURCE_IDS = {5658, 5777}
CORRECTED_GRAPES = {5658: ("Syrah/Shiraz", "Cabernet Sauvignon")}


def aliases_after_old_merge(target, source):
    """Reproduce the earlier merge's alias append so it can be safely undone."""
    aliases = target[2]
    for name in (target[0], target[1], source[0], source[1], source[2]):
        if name and name.casefold() not in aliases.casefold():
            aliases = f"{aliases}, {name}" if aliases else name
    return aliases


class Command(BaseCommand):
    help = "Restore two bottles incorrectly merged by the earlier photo audit."

    def add_arguments(self, parser):
        parser.add_argument("--original-backup", required=True)
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--backup-path")

    def handle(self, *args, **options):
        if options["apply"] and not options["backup_path"]:
            raise CommandError("--apply requires --backup-path.")

        original_aliases = self._verify_original_backup(options["original_backup"])
        ids = {wine_id for source, old, new, _, _ in REPAIRS for wine_id in (source, old, new)}
        wines = Wine.objects.in_bulk(ids)
        if set(wines) != ids:
            raise CommandError("A repair source or representative is missing.")

        corrected_grapes = {}
        for source_id, names in CORRECTED_GRAPES.items():
            grapes = list(GrapeVariety.objects.filter(eng_name__in=names))
            if len(grapes) != len(names) or {grape.eng_name for grape in grapes} != set(names):
                raise CommandError(f"Corrected grape varieties for wine {source_id} are ambiguous.")
            corrected_grapes[source_id] = grapes

        favorites = User.favorite_wines.through
        summary = []
        pending = []
        for source_id, old_target_id, new_target_id, review_ids, source_name in REPAIRS:
            source = wines[source_id]
            old_target = wines[old_target_id]
            new_target = wines[new_target_id]
            allowed_names = {normalized_name(source_name)}
            if source_id in CANONICAL_ENGLISH_NAMES:
                allowed_names.add(normalized_name(CANONICAL_ENGLISH_NAMES[source_id]))
            if normalized_name(source.eng_name) not in allowed_names:
                raise CommandError(f"Repair source {source_id} has an unexpected name.")
            if not old_target.catalog_visible or old_target.canonical_wine_id is not None:
                raise CommandError(f"Mistaken target {old_target_id} is not active.")
            if new_target_id != source_id and (
                not new_target.catalog_visible or new_target.canonical_wine_id is not None
            ):
                raise CommandError(f"Correct representative {new_target_id} is not active.")
            if source.type != old_target.type or source.country_id != old_target.country_id:
                raise CommandError(f"Wine details changed for repair source {source_id}.")
            if new_target_id != source_id and (
                source.type != new_target.type or source.country_id != new_target.country_id
            ):
                raise CommandError(f"Correct representative {new_target_id} conflicts with source {source_id}.")

            was_mismerged = not source.catalog_visible and source.canonical_wine_id == old_target_id
            corrected = (
                source.catalog_visible and source.canonical_wine_id is None
                if new_target_id == source_id
                else not source.catalog_visible and source.canonical_wine_id == new_target_id
            )
            if not (was_mismerged or corrected):
                raise CommandError(f"Repair source {source_id} has an unexpected redirect.")
            if was_mismerged and favorites.objects.filter(wine_id=source_id).exists():
                raise CommandError(f"Archived repair source {source_id} has favorites.")

            current_review_wines = dict(
                WineReview.objects.filter(id__in=review_ids).values_list("id", "wine_id")
            )
            if set(current_review_wines) != set(review_ids):
                raise CommandError(f"An original review for source {source_id} is missing.")
            if any(wine_id not in (old_target_id, new_target_id) for wine_id in current_review_wines.values()):
                raise CommandError(f"An original review for source {source_id} moved unexpectedly.")
            to_move = sorted(
                review_id for review_id, wine_id in current_review_wines.items()
                if wine_id != new_target_id
            )
            details_changed = source_id in CORRECTED_SOURCE_IDS and (
                source.eng_name != CANONICAL_ENGLISH_NAMES[source_id]
                or source.kor_name != CANONICAL_KOREAN_NAMES[source_id]
                or source.search_aliases != (
                    f"{CANONICAL_ENGLISH_NAMES[source_id]}, {CANONICAL_KOREAN_NAMES[source_id]}"
                )
                or (
                    source_id in corrected_grapes
                    and set(source.grape_varieties.values_list("id", flat=True))
                    != {grape.id for grape in corrected_grapes[source_id]}
                )
            )
            if was_mismerged or to_move or details_changed:
                pending.append((source_id, new_target_id, to_move, was_mismerged))
            summary.append({
                "source": source_id,
                "old_target": old_target_id,
                "correct_target": new_target_id,
                "reviews_to_restore": to_move,
                "redirect_to_correct": was_mismerged,
                "details_to_correct": details_changed,
            })

        alias_cleanup = {}
        for old_target_id, (original, after_merge) in original_aliases.items():
            current = wines[old_target_id].search_aliases
            if current not in (original, after_merge):
                raise CommandError(
                    f"Aliases for mistaken target {old_target_id} changed since the backup."
                )
            if current != original:
                alias_cleanup[old_target_id] = original
        self.stdout.write(json.dumps(summary, ensure_ascii=False))
        self.stdout.write(json.dumps({"alias_cleanup_ids": sorted(alias_cleanup)}))
        if not options["apply"]:
            self.stdout.write("DRY RUN: no database changes")
            return
        if not pending and not alias_cleanup:
            self.stdout.write("Already repaired: no database changes")
            return

        self._backup(options["backup_path"])
        before_reviews = WineReview.objects.count()
        before_images = WineReviewImage.objects.count()
        before_visible = Wine.objects.filter(catalog_visible=True).count()
        with transaction.atomic():
            for source_id, new_target_id, review_ids, _ in pending:
                source = Wine.objects.get(pk=source_id)
                if review_ids:
                    moved = WineReview.objects.filter(
                        id__in=review_ids,
                        wine_id=next(old for current, old, _, _, _ in REPAIRS if current == source_id),
                    ).update(wine_id=new_target_id)
                    if moved != len(review_ids):
                        raise CommandError(f"Reviews for source {source_id} changed during repair.")
                source.catalog_visible = new_target_id == source_id
                source.canonical_wine_id = None if new_target_id == source_id else new_target_id
                fields = ["catalog_visible", "canonical_wine", "updated_at"]
                if source_id in CORRECTED_SOURCE_IDS:
                    source.eng_name = CANONICAL_ENGLISH_NAMES[source_id]
                    source.kor_name = CANONICAL_KOREAN_NAMES[source_id]
                    source.search_aliases = f"{source.eng_name}, {source.kor_name}"
                    fields.extend(("eng_name", "kor_name", "search_aliases"))
                source.save(update_fields=fields)
                if source_id in corrected_grapes:
                    source.grape_varieties.set(corrected_grapes[source_id])

            for wine_id, cleaned in alias_cleanup.items():
                target = Wine.objects.get(pk=wine_id)
                target.search_aliases = cleaned
                target.save(update_fields=["search_aliases", "updated_at"])

            if WineReview.objects.count() != before_reviews or WineReviewImage.objects.count() != before_images:
                raise CommandError("Review or image count changed; rolling back.")
            restored_visible = sum(
                was_mismerged and source_id == new_target_id
                for source_id, new_target_id, _, was_mismerged in pending
            )
            if Wine.objects.filter(catalog_visible=True).count() != before_visible + restored_visible:
                raise CommandError("Visible wine count changed unexpectedly; rolling back.")
        self.stdout.write(self.style.SUCCESS("APPLIED: incorrect bottle merges repaired"))

    def _verify_original_backup(self, path):
        backup = Path(path).expanduser().resolve()
        if not backup.is_file():
            raise CommandError("Original premerge backup does not exist.")
        aliases = {}
        try:
            with closing(sqlite3.connect(f"{backup.as_uri()}?mode=ro", uri=True)) as snapshot:
                for source_id, old_target_id, _, review_ids, source_name in REPAIRS:
                    original_ids = tuple(
                        row[0] for row in snapshot.execute(
                            "SELECT id FROM wine_winereview WHERE wine_id = ? ORDER BY id", (source_id,)
                        )
                    )
                    if original_ids != tuple(sorted(review_ids)):
                        raise CommandError(
                            f"Original review IDs for wine {source_id} do not match the premerge backup."
                        )
                    original_favorites = tuple(snapshot.execute(
                        f"SELECT user_id FROM {User.favorite_wines.through._meta.db_table} WHERE wine_id = ?",
                        (source_id,),
                    ))
                    if original_favorites:
                        raise CommandError(f"Wine {source_id} had favorites; this repair cannot restore them.")
                    old_wine = snapshot.execute(
                        "SELECT catalog_visible, canonical_wine_id, eng_name, kor_name, search_aliases "
                        "FROM wine_wine WHERE id = ?",
                        (source_id,),
                    ).fetchone()
                    if old_wine is None or old_wine[:2] != (1, None):
                        raise CommandError(f"Wine {source_id} was not active in the premerge backup.")
                    if normalized_name(old_wine[2]) != normalized_name(source_name):
                        raise CommandError(f"Wine {source_id} has a different name in the backup.")
                    old_target = snapshot.execute(
                        "SELECT eng_name, kor_name, search_aliases FROM wine_wine WHERE id = ?",
                        (old_target_id,),
                    ).fetchone()
                    if old_target is None:
                        raise CommandError(f"Mistaken target {old_target_id} is absent from the backup.")
                    aliases[old_target_id] = (
                        old_target[2], aliases_after_old_merge(old_target, old_wine[2:]),
                    )
        except sqlite3.DatabaseError as exc:
            raise CommandError(f"Cannot read original premerge backup: {exc}") from exc
        return aliases

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

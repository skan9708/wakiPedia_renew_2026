"""Apply a reviewed representative-wine export without recreating user reviews."""

import hashlib
import json
import sqlite3
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.db.models import Count

from user.models import User
from wine.photo_metadata_exceptions import PHOTO_METADATA_EXCEPTIONS
from wine.models import Country, GrapeVariety, Wine, WineReview
from wine.verified_catalog_merges import (
    CANONICAL_ENGLISH_NAMES,
    CANONICAL_KOREAN_NAMES,
    EXCLUDE_SOURCE_ALIASES,
    VERIFIED_CATALOG_MAP,
    VERIFIED_CATALOG_NAMES,
)


TYPE_MAP = {
    "레드": "red", "화이트": "white", "스파클링": "sparkling", "로제": "rose",
    "주정강화": "주정강화", "맥주": "맥주", "증류주": "증류주",
    "시드르": "시드르", "과실주": "과실주",
}

# These representative pairs were verified against bottle labels. The 2019
# Decoy Merlot photos match; wine 8010's photo reads Cabernet Sauvignon.
# This catalog groups vintages of the same named wine together.
REPRESENTATIVE_MERGES = {6063: 5521, 5803: 4816, 8010: 8437, **VERIFIED_CATALOG_MAP}
REPRESENTATIVE_MERGE_NAMES = {
    6063: ("Villa Maria Sauvignon Blanc", "Villa Maria,Private Bin Sauvignon Blanc"),
    5803: ("Decoy sonoma county Merlot", "Duckhorn Decoy Merlot"),
    8010: ("decoy", "Decoy Cabernet Sauvignon"),
    **VERIFIED_CATALOG_NAMES,
}


def normalized_name(value):
    return "".join(
        char for char in unicodedata.normalize("NFKC", value or "").casefold()
        if char.isalnum()
    )


def name_key(wine):
    return normalized_name(wine.eng_name), normalized_name(wine.kor_name)


def load_export(path):
    raw = Path(path).read_bytes()
    data = json.loads(raw)
    wines = data.get("wines")
    reviews = data.get("reviews")
    mappings = data.get("legacyWineIdMap")
    if not all(isinstance(value, list) for value in (wines, reviews, mappings)):
        raise CommandError("Export needs wines, reviews and legacyWineIdMap arrays.")
    ids = [wine["id"] for wine in wines]
    source_ids = [item["legacyWineId"] for item in mappings]
    targets = [item["wineId"] for item in mappings]
    if len(ids) != len(set(ids)) or len(source_ids) != len(set(source_ids)):
        raise CommandError("Duplicate wine or legacy ID in export.")
    if set(targets) != set(ids) or not set(ids).issubset(source_ids):
        raise CommandError("Legacy map and representative wine IDs disagree.")
    mapping = dict(zip(source_ids, targets))
    if any(mapping[representative] != representative for representative in ids):
        raise CommandError("Each representative must map to itself.")
    inverse = defaultdict(set)
    for source, target in mapping.items():
        inverse[target].add(source)
    for wine in wines:
        if not wine.get("nameEn") or not wine.get("nameKo"):
            raise CommandError(f"Wine {wine['id']} has a missing name.")
        if len(wine["nameEn"]) > 255 or len(wine["nameKo"]) > 255:
            raise CommandError(f"Wine {wine['id']} name exceeds 255 characters.")
        if set(wine.get("legacyWineIds", [])) != inverse[wine["id"]]:
            raise CommandError(f"Wine {wine['id']} legacyWineIds disagree with the map.")
        if wine.get("type") not in TYPE_MAP and wine.get("type") is not None:
            raise CommandError(f"Wine {wine['id']} has an unknown type: {wine['type']}.")
        for field in ("body", "sweetness", "acidity", "tannin"):
            value = wine.get(field)
            if value is not None and (type(value) is not int or not 1 <= value <= 5):
                raise CommandError(f"Wine {wine['id']} has invalid {field}.")
    review_ids = [review["id"] for review in reviews]
    if len(review_ids) != len(set(review_ids)):
        raise CommandError("Duplicate review ID in export.")
    for review in reviews:
        if mapping.get(review["legacyWineId"]) != review["wineId"]:
            raise CommandError(f"Review {review['id']} disagrees with the legacy map.")
    return data, mapping, hashlib.sha256(raw).hexdigest()


def apply_reviewed_merges(data, mapping):
    by_id = {item["id"]: item for item in data["wines"]}
    for source, target in REPRESENTATIVE_MERGES.items():
        if (source not in by_id or target not in by_id
                or source == target or target in REPRESENTATIVE_MERGES
                or mapping.get(source) != source or mapping.get(target) != target):
            raise CommandError(f"Invalid reviewed representative merge {source}:{target}.")
        original, representative = by_id[source], by_id[target]
        expected_source, expected_target = REPRESENTATIVE_MERGE_NAMES[source]
        if (normalized_name(original["nameEn"]) != normalized_name(expected_source)
                or normalized_name(representative["nameEn"]) != normalized_name(expected_target)):
            raise CommandError(f"Reviewed merge {source}:{target} has unexpected wine names.")
        source_grapes = {name.strip() for name in (original.get("grapesRaw") or "").split(",") if name.strip()}
        target_grapes = {name.strip() for name in (representative.get("grapesRaw") or "").split(",") if name.strip()}
        if source in PHOTO_METADATA_EXCEPTIONS:
            source_details = {
                "name": original["nameEn"], "type": original["type"],
                "country": original["country"], "image_url": None,
            }
            target_details = {
                "name": representative["nameEn"], "type": representative["type"],
                "country": representative["country"], "image_url": None,
            }
            if not PHOTO_METADATA_EXCEPTIONS[source](
                source, target, source_details, target_details, source_grapes, target_grapes,
            ):
                raise CommandError(f"Reviewed photographed merge {source}:{target} changed metadata.")
        else:
            if any(original[field] != representative[field] for field in ("country", "type")):
                raise CommandError(f"Reviewed merge {source}:{target} has conflicting wine details.")
            grapes_conflict = (
                source_grapes and target_grapes and not source_grapes & target_grapes
                if source in VERIFIED_CATALOG_MAP
                else not source_grapes.issubset(target_grapes)
            )
            if grapes_conflict:
                raise CommandError(f"Reviewed merge {source}:{target} has conflicting grapes.")
            if source in VERIFIED_CATALOG_MAP and source_grapes and not target_grapes:
                representative["grapesRaw"] = original["grapesRaw"]
        aliases = representative.get("searchAliasesRaw") or ""
        source_aliases = () if source in EXCLUDE_SOURCE_ALIASES else (
            original["nameEn"], original["nameKo"], original.get("searchAliasesRaw") or ""
        )
        for name in source_aliases:
            if name and name.casefold() not in aliases.casefold():
                aliases = f"{aliases}, {name}" if aliases else name
        representative["searchAliasesRaw"] = aliases
    by_id[4816]["nameEn"] = "Decoy Merlot"
    by_id[4816]["nameKo"] = "디코이 메를로"
    for target, corrected_name in CANONICAL_ENGLISH_NAMES.items():
        if target in by_id:
            by_id[target]["nameEn"] = corrected_name
    for target, corrected_name in CANONICAL_KOREAN_NAMES.items():
        if target in by_id:
            by_id[target]["nameKo"] = corrected_name
    for source_id in (5658, 5777):
        if source_id not in by_id:
            continue
        by_id[source_id]["searchAliasesRaw"] = (
            f"{by_id[source_id]['nameEn']}, {by_id[source_id]['nameKo']}"
        )
    # Wine 5658's old export wrongly omits the Cabernet Sauvignon component.
    if 5658 in by_id:
        by_id[5658]["grapesRaw"] = "쉬라, 까베르네소비뇽"
    representatives = [item for item in data["wines"] if item["id"] not in REPRESENTATIVE_MERGES]
    mapping = {source: REPRESENTATIVE_MERGES.get(target, target) for source, target in mapping.items()}
    return representatives, mapping


class Command(BaseCommand):
    help = "Preview or apply a representative-wine JSON export while preserving live reviews."

    def add_arguments(self, parser):
        parser.add_argument("json_file")
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--expected-sha256")
        parser.add_argument("--backup-path")
        parser.add_argument(
            "--resolve-legacy", action="append", default=[], metavar="OLD_ID:TARGET_ID",
            help="Resolve an otherwise ambiguous archived wine after checking the bottle.",
        )

    def handle(self, *args, **options):
        data, mapping, digest = load_export(options["json_file"])
        if options["expected_sha256"] and digest != options["expected_sha256"].lower():
            raise CommandError("Export checksum does not match --expected-sha256.")
        if options["apply"] and (not options["expected_sha256"] or not options["backup_path"]):
            raise CommandError("--apply requires --expected-sha256 and --backup-path.")
        representatives, mapping = apply_reviewed_merges(data, mapping)
        canonical_ids = set(item["id"] for item in representatives)
        all_wines = Wine.objects.in_bulk()
        missing = set(mapping) - set(all_wines)
        if missing:
            raise CommandError(f"{len(missing)} legacy wine IDs are missing from the database.")
        if not canonical_ids.issubset(all_wines):
            raise CommandError("A representative wine is missing from the database.")

        # The old duplicate import precedes ID 4801. Later user-created wines are untouched.
        if min(source for source in mapping if source > 1000) != 4801:
            raise CommandError("Unexpected legacy ID boundary; inspect this database first.")
        extra_ids = set(range(1, 4801)) - set(mapping)
        if not extra_ids.issubset(all_wines):
            raise CommandError("An old duplicate wine is missing from the database.")
        by_name = defaultdict(set)
        for source, target in mapping.items():
            by_name[name_key(all_wines[source])].add(target)

        redirects = {source: target for source, target in mapping.items() if source != target}
        ambiguous = {}
        for source in sorted(extra_ids):
            old = all_wines[source]
            if old.canonical_wine_id in canonical_ids:
                redirects[source] = old.canonical_wine_id
                continue
            choices = by_name[name_key(all_wines[source])]
            if not old.catalog_visible:
                # A previous run deliberately left this row unresolved. Renamed
                # representatives must not change that decision on a retry.
                ambiguous[source] = sorted(choices)
                continue
            if len(choices) == 1:
                redirects[source] = next(iter(choices))
            else:
                ambiguous[source] = sorted(choices)

        for pair in options["resolve_legacy"]:
            try:
                source, target = (int(part) for part in pair.split(":"))
            except (ValueError, TypeError):
                raise CommandError("--resolve-legacy must use OLD_ID:TARGET_ID.")
            if source not in ambiguous or target not in canonical_ids:
                raise CommandError(f"{pair} is not an ambiguous source and representative target.")
            redirects[source] = target
            del ambiguous[source]

        review_counts = Counter(dict(
            WineReview.objects.order_by().values_list("wine_id").annotate(count=Count("id"))
        ))
        favorite_through = User.favorite_wines.through
        favorite_counts = Counter(dict(
            favorite_through.objects.order_by().values_list("wine_id").annotate(count=Count("id"))
        ))
        image_sources = defaultdict(list)
        for source, target in redirects.items():
            old = all_wines[source]
            if old.image or old.image_url:
                image_sources[target].append(old)
        image_fill = {
            target: min(sources, key=lambda wine: (not bool(wine.image), wine.id))
            for target, sources in image_sources.items()
            if not (all_wines[target].image or all_wines[target].image_url)
        }
        summary = {
            "sha256": digest,
            "representatives": len(canonical_ids),
            "mapped_legacy_ids": len(mapping),
            "redirects": len(redirects),
            "ambiguous_archived_ids": len(ambiguous),
            "ambiguous_with_reviews": {str(i): review_counts[i] for i in ambiguous if review_counts[i]},
            "reviews_to_move": sum(review_counts[i] for i in redirects),
            "favorites_to_move": sum(favorite_counts[i] for i in redirects),
            "images_to_fill": len(image_fill),
            "existing_reviews": WineReview.objects.count(),
            "newer_wines_preserved": sum(i > max(mapping) for i in all_wines),
        }
        self.stdout.write(json.dumps(summary, ensure_ascii=False, sort_keys=True))
        if not options["apply"]:
            self.stdout.write("DRY RUN: no database changes")
            return

        self._backup(options["backup_path"])
        previous_review_count = summary["existing_reviews"]
        with transaction.atomic():
            countries = {country.kor_name: country for country in Country.objects.all()}
            for item in representatives:
                country_name = item.get("country") or ""
                if country_name and country_name not in countries:
                    countries[country_name] = Country.objects.create(
                        kor_name=country_name, eng_name=country_name,
                    )
            now = datetime.now()
            updates = []
            for item in representatives:
                wine = all_wines[item["id"]]
                wine.eng_name = item["nameEn"]
                wine.kor_name = item["nameKo"]
                wine.country = countries.get(item.get("country") or "")
                wine.type = TYPE_MAP.get(item.get("type"), "")
                wine.search_aliases = item.get("searchAliasesRaw") or ""
                for field in ("body", "sweetness", "acidity", "tannin"):
                    setattr(wine, f"source_{field}", item.get(field))
                wine.catalog_visible = True
                wine.canonical_wine_id = None
                if item["id"] in image_fill:
                    source = image_fill[item["id"]]
                    wine.image = source.image
                    wine.image_url = source.image_url
                wine.updated_at = now
                updates.append(wine)
            Wine.objects.bulk_update(updates, [
                "eng_name", "kor_name", "country", "type", "search_aliases",
                "source_body", "source_sweetness", "source_acidity", "source_tannin",
                "catalog_visible", "canonical_wine", "image", "image_url", "updated_at",
            ], batch_size=80)

            grape_lookup = {}
            for grape in GrapeVariety.objects.order_by("id"):
                grape_lookup.setdefault(grape.kor_name, grape)
            for item in representatives:
                names = dict.fromkeys(
                    name.strip() for name in (item.get("grapesRaw") or "").split(",")
                    if name.strip()
                )
                grapes = []
                for name in names:
                    if name not in grape_lookup:
                        grape_lookup[name] = GrapeVariety.objects.create(
                            kor_name=name, eng_name=name,
                        )
                    grapes.append(grape_lookup[name])
                wine = all_wines[item["id"]]
                current = set(wine.grape_varieties.values_list("id", flat=True))
                desired = {grape.id for grape in grapes}
                if current != desired:
                    wine.grape_varieties.set(grapes)

            hidden = []
            for source in set(mapping) | extra_ids:
                if source in canonical_ids:
                    continue
                wine = all_wines[source]
                wine.catalog_visible = False
                wine.canonical_wine_id = redirects.get(source)
                wine.updated_at = now
                hidden.append(wine)
            Wine.objects.bulk_update(hidden, [
                "catalog_visible", "canonical_wine", "updated_at",
            ], batch_size=200)

            for source, target in redirects.items():
                if review_counts[source]:
                    WineReview.objects.filter(wine_id=source).update(wine_id=target)
                if favorite_counts[source]:
                    users = list(favorite_through.objects.filter(wine_id=source).values_list("user_id", flat=True))
                    favorite_through.objects.bulk_create(
                        [favorite_through(user_id=user_id, wine_id=target) for user_id in users],
                        ignore_conflicts=True,
                    )
                    favorite_through.objects.filter(wine_id=source).delete()

            if WineReview.objects.count() != previous_review_count:
                raise CommandError("Review count changed; rolling back.")
            if WineReview.objects.filter(wine_id__in=redirects).exists():
                raise CommandError("A review still points to a redirected wine; rolling back.")
            if Wine.objects.filter(catalog_visible=True, id__lte=max(mapping)).count() != len(canonical_ids):
                raise CommandError("Representative wine count differs; rolling back.")
        self.stdout.write(self.style.SUCCESS("APPLIED: database backup saved at " + options["backup_path"]))

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

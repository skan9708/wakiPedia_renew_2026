from unittest.mock import patch

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase

from user.models import User
from wine.management.commands import import_wine_catalog, merge_verified_catalog_wines
from wine.models import Country, GrapeVariety, Wine, WineReview, WineReviewImage
from wine.photo_metadata_exceptions import PHOTO_METADATA_EXCEPTIONS
from wine.verified_catalog_merges import CANONICAL_ENGLISH_NAMES, PHOTO_VERIFIED_MERGES


class ReviewedCatalogImportTests(SimpleTestCase):
    def test_every_verified_mapping_survives_reimport(self):
        names = import_wine_catalog.REPRESENTATIVE_MERGE_NAMES
        mapping = {}
        wines = {}
        for source, target in import_wine_catalog.REPRESENTATIVE_MERGES.items():
            source_name, target_name = names[source]
            for wine_id, name in ((source, source_name), (target, target_name)):
                mapping[wine_id] = wine_id
                wines.setdefault(wine_id, {
                    "id": wine_id, "nameEn": name, "nameKo": f"Wine {wine_id}",
                    "country": "Test country", "type": "red", "grapesRaw": "Test grape",
                    "searchAliasesRaw": name,
                })
        for target_id, grapes in (
            (8369, "샤렐로, 마카베오, 빠레야다"),
            (5670, "마카베오, 샤렐로, 빠레야다"),
        ):
            wines[target_id].update(country="스페인", type="스파클링", grapesRaw=grapes)
            for source_id, representative_id in import_wine_catalog.REPRESENTATIVE_MERGES.items():
                if representative_id == target_id and source_id not in PHOTO_METADATA_EXCEPTIONS:
                    wines[source_id].update(country="스페인", type="스파클링", grapesRaw=grapes)
        wines[5653].update(country="스페인", type="레드", grapesRaw="가르나차, 템프라니요")
        wines[6437].update(country="스페인", type="스파클링", grapesRaw="샤도네이")
        representatives, redirected = import_wine_catalog.apply_reviewed_merges(
            {"wines": list(wines.values())}, mapping
        )
        by_id = {wine["id"]: wine for wine in representatives}
        self.assertEqual(len(representatives), len(wines) - len(names))
        for source, target in import_wine_catalog.REPRESENTATIVE_MERGES.items():
            self.assertEqual(redirected[source], target)
            self.assertNotIn(source, by_id)
        self.assertEqual(by_id[4874]["nameEn"], CANONICAL_ENGLISH_NAMES[4874])
        self.assertNotIn("Brut Nature", by_id[4874]["searchAliasesRaw"])


class VerifiedCatalogMergeTests(TestCase):
    def setUp(self):
        country = Country.objects.create(kor_name="Test country", eng_name="Test country")
        malbec = GrapeVariety.objects.create(kor_name="Malbec", eng_name="Malbec")
        other = GrapeVariety.objects.create(kor_name="Other", eng_name="Other")
        cabernet = GrapeVariety.objects.create(kor_name="Cabernet", eng_name="Cabernet")
        self.unanime_source = Wine.objects.create(
            id=6322, eng_name="UNANIME", kor_name="Unanime Malbec", type="red", country=country,
            image_url="https://example.com/unamine.jpg",
        )
        self.unanime_target = Wine.objects.create(
            id=6470, eng_name="Unanime", kor_name="Unanime", type="red", country=country,
        )
        self.unanime_legacy = Wine.objects.create(
            id=123, eng_name="Old Unanime", kor_name="Old Unanime", type="red", country=country,
            catalog_visible=False, canonical_wine=self.unanime_source,
        )
        self.cazanove_source = Wine.objects.create(
            id=9182, eng_name="Champagne Charles de Cazanove Brut Nature",
            kor_name="Cazanove Brut Nature", type="sparkling", country=country,
            search_aliases="Champagne Charles de Cazanove Brut Nature",
        )
        self.cazanove_target = Wine.objects.create(
            id=4874, eng_name="Champagne Charles de Cazanove Brut",
            kor_name="Cazanove Brut", type="sparkling", country=country,
            image_url="https://example.com/cazanove.jpg",
        )
        self.unanime_source.grape_varieties.add(malbec, other)
        self.unanime_target.grape_varieties.add(malbec, cabernet)
        self.cazanove_source.grape_varieties.add(cabernet)
        self.cazanove_target.grape_varieties.add(cabernet)
        self.user = User.objects.create_user(
            email="verified-merge-test@example.com", password="test-password", nickname="Verified merge"
        )
        self.user.favorite_wines.add(self.unanime_source, self.unanime_target, self.cazanove_source)
        for wine in (self.unanime_source, self.unanime_target, self.unanime_legacy, self.cazanove_source):
            review = WineReview.objects.create(
                wine=wine, user=self.user, text="Review", rating=40,
                body=2, acidity=2, sweetness=2, tannin=2,
            )
            if wine == self.unanime_source:
                WineReviewImage.objects.create(review=review, image="review_images/verified.jpg")

    def test_merge_preserves_reviews_favorites_images_and_redirects(self):
        chosen = tuple(
            entry for entry in PHOTO_VERIFIED_MERGES if entry[0] in {6322, 9182}
        )
        with (
            patch.object(merge_verified_catalog_wines, "PHOTO_VERIFIED_MERGES", chosen),
            patch.object(merge_verified_catalog_wines.Command, "_backup") as backup,
        ):
            call_command("merge_verified_catalog_wines", "--apply", "--backup-path", "unused-test-backup.sqlite3")
            call_command("merge_verified_catalog_wines", "--apply", "--backup-path", "unused-test-backup.sqlite3")
            backup.assert_called_once()

        self.unanime_source.refresh_from_db()
        self.unanime_target.refresh_from_db()
        self.cazanove_source.refresh_from_db()
        self.cazanove_target.refresh_from_db()
        self.assertFalse(self.unanime_source.catalog_visible)
        self.assertEqual(self.unanime_source.canonical_wine_id, 6470)
        self.unanime_legacy.refresh_from_db()
        self.assertEqual(self.unanime_legacy.canonical_wine_id, 6470)
        self.assertEqual(self.unanime_target.image_url, "https://example.com/unamine.jpg")
        self.assertEqual(WineReview.objects.filter(wine_id=6470).count(), 3)
        self.assertEqual(WineReview.objects.filter(wine_id=4874).count(), 1)
        self.assertEqual(WineReview.objects.count(), 4)
        self.assertEqual(WineReviewImage.objects.count(), 1)
        self.assertEqual(set(self.user.favorite_wines.values_list("id", flat=True)), {6470, 4874})
        self.assertEqual(self.cazanove_target.eng_name, CANONICAL_ENGLISH_NAMES[4874])
        self.assertNotIn("Brut Nature", self.cazanove_target.search_aliases)
        self.assertEqual(self.client.get("/api/wines/6322/").data["id"], 6470)
        self.assertEqual(self.client.get("/api/wines/9182/").data["id"], 4874)


class PreviouslyMergedRedirectTests(TestCase):
    def test_merging_a_previous_representative_flattens_redirects(self):
        country = Country.objects.create(kor_name="Test country", eng_name="Test country")
        target = Wine.objects.create(
            id=7001, eng_name="Example Pinot Noir", kor_name="Example Pinot Noir",
            type="red", country=country,
        )
        previous_representative = Wine.objects.create(
            id=7002, eng_name="Example Pinot Noir", kor_name="Example Pinot Noir",
            type="red", country=country, search_aliases="Example Pinot Noir",
        )
        archived_source = Wine.objects.create(
            id=7003, eng_name="Example Pinot Noir", kor_name="Example Pinot Noir",
            type="red", country=country, catalog_visible=False,
            canonical_wine=previous_representative,
        )
        older_redirect = Wine.objects.create(
            id=7004, eng_name="Example Pinot Noir", kor_name="Example Pinot Noir",
            type="red", country=country, catalog_visible=False,
            canonical_wine=target,
        )
        legacy = Wine.objects.create(
            id=123, eng_name="Legacy Example Pinot Noir", kor_name="Example Pinot Noir",
            type="red", country=country, catalog_visible=False,
            canonical_wine=previous_representative,
        )
        user = User.objects.create_user(
            email="redirect-merge-test@example.com", password="test-password", nickname="Redirect merge"
        )
        user.favorite_wines.add(target, previous_representative, archived_source, legacy)
        for wine in (target, previous_representative, archived_source, legacy):
            review = WineReview.objects.create(
                wine=wine, user=user, text="Review", rating=40,
                body=2, acidity=2, sweetness=2, tannin=2,
            )
            WineReviewImage.objects.create(review=review, image=f"review_images/{wine.id}.jpg")

        chosen = (
            (7003, 7001, "Example Pinot Noir", "Example Pinot Noir"),
            (7002, 7001, "Example Pinot Noir", "Example Pinot Noir"),
            (7004, 7001, "Example Pinot Noir", "Example Pinot Noir"),
        )
        with (
            patch.object(merge_verified_catalog_wines, "PHOTO_VERIFIED_MERGES", chosen),
            patch.object(merge_verified_catalog_wines.Command, "_backup") as backup,
        ):
            call_command("merge_verified_catalog_wines", "--apply", "--backup-path", "unused-test-backup.sqlite3")
            call_command("merge_verified_catalog_wines", "--apply", "--backup-path", "unused-test-backup.sqlite3")
            backup.assert_called_once()

        for wine in (previous_representative, archived_source, older_redirect, legacy):
            wine.refresh_from_db()
            self.assertFalse(wine.catalog_visible)
            self.assertEqual(wine.canonical_wine_id, target.id)
        self.assertEqual(WineReview.objects.filter(wine=target).count(), 4)
        self.assertEqual(WineReviewImage.objects.count(), 4)
        self.assertEqual(set(user.favorite_wines.values_list("id", flat=True)), {target.id})
        self.assertIn("Example Pinot Noir", Wine.objects.get(id=target.id).search_aliases)

from unittest.mock import patch

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase

from user.models import User
from wine.management.commands import import_wine_catalog, merge_verified_catalog_wines
from wine.models import Country, GrapeVariety, Wine, WineReview, WineReviewImage
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

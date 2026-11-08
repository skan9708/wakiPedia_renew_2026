from unittest.mock import patch

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase

from user.models import User
from wine.management.commands.merge_reviewed_decoy_wines import Command
from wine.management.commands.import_wine_catalog import apply_reviewed_merges
from wine.models import Country, GrapeVariety, Wine, WineReview, WineReviewImage


class ReviewedExportMergeTests(SimpleTestCase):
    def test_reimport_preserves_photo_verified_merges_and_aliases(self):
        def wine(pk, english, korean, country, wine_type, grapes):
            return {
                "id": pk, "nameEn": english, "nameKo": korean,
                "country": country, "type": wine_type,
                "grapesRaw": grapes, "searchAliasesRaw": english,
            }

        wines = [
            wine(5521, "Villa Maria,Private Bin Sauvignon Blanc", "빌라 마리아", "뉴질랜드", "화이트", "소비뇽 블랑"),
            wine(6063, "Villa Maria Sauvignon Blanc", "빌라 마리아", "뉴질랜드", "화이트", "소비뇽 블랑"),
            wine(4816, "Duckhorn Decoy Merlot", "덕혼 디코이 메를로", "미국", "레드", "메를로, 카베르네 소비뇽, 기타품종"),
            wine(5803, "Decoy sonoma county Merlot", "디코이 메를로", "미국", "레드", "카베르네 소비뇽, 메를로"),
            wine(8010, "decoy", "디코이", "미국", "레드", "카베르네 소비뇽"),
            wine(8437, "Decoy Cabernet Sauvignon", "디코이 카베르네 소비뇽", "미국", "레드", "카베르네 소비뇽"),
        ]
        mapping = {item["id"]: item["id"] for item in wines}
        representatives, mapping = apply_reviewed_merges({"wines": wines}, mapping)
        by_id = {item["id"]: item for item in representatives}

        self.assertEqual(mapping[5803], 4816)
        self.assertEqual(mapping[8010], 8437)
        self.assertEqual(mapping[6063], 5521)
        self.assertEqual(by_id[4816]["nameEn"], "Decoy Merlot")
        self.assertEqual(by_id[4816]["nameKo"], "디코이 메를로")
        self.assertIn("Decoy sonoma county Merlot", by_id[4816]["searchAliasesRaw"])
        self.assertIn("decoy", by_id[8437]["searchAliasesRaw"].casefold())


class ReviewedDecoyMergeTests(TestCase):
    def setUp(self):
        country = Country.objects.create(kor_name="미국", eng_name="USA")
        merlot = GrapeVariety.objects.create(kor_name="메를로", eng_name="Merlot")
        cabernet = GrapeVariety.objects.create(kor_name="카베르네 소비뇽", eng_name="Cabernet Sauvignon")
        other = GrapeVariety.objects.create(kor_name="기타품종", eng_name="Other")
        self.merlot_target = Wine.objects.create(
            id=4816, kor_name="덕혼 디코이 메를로", eng_name="Duckhorn Decoy Merlot",
            type="red", country=country, search_aliases="Duckhorn Decoy Merlot",
            image_url="https://example.com/merlot.jpg",
        )
        self.merlot_source = Wine.objects.create(
            id=5803, kor_name="디코이 메를로", eng_name="Decoy sonoma county Merlot",
            type="red", country=country, search_aliases="Decoy sonoma county Merlot",
        )
        self.merlot_legacy = Wine.objects.create(
            id=1010, kor_name="디코이 메를로 2019", eng_name="Decoy Merlot 2019",
            type="red", country=country, catalog_visible=False, canonical_wine=self.merlot_source,
        )
        self.cabernet_source = Wine.objects.create(
            id=8010, kor_name="디코이", eng_name="decoy", type="red", country=country,
            image_url="https://example.com/cabernet.jpg",
        )
        self.cabernet_target = Wine.objects.create(
            id=8437, kor_name="디코이 카베르네 소비뇽", eng_name="Decoy Cabernet Sauvignon",
            type="red", country=country,
        )
        self.cabernet_legacy = Wine.objects.create(
            id=3216, kor_name="디코이", eng_name="decoy", type="red", country=country,
            catalog_visible=False, canonical_wine=self.cabernet_source,
        )
        self.merlot_target.grape_varieties.add(merlot, cabernet, other)
        self.merlot_source.grape_varieties.add(merlot, cabernet)
        self.cabernet_source.grape_varieties.add(cabernet)
        self.cabernet_target.grape_varieties.add(cabernet)
        self.user = User.objects.create_user(email="decoy-test@example.com", password="test-password", nickname="리뷰어")
        self.user.favorite_wines.add(self.merlot_source, self.merlot_target, self.cabernet_source)
        for wine in (self.merlot_target, self.merlot_source, self.merlot_legacy, self.cabernet_target):
            review = WineReview.objects.create(
                wine=wine, user=self.user, text="Test review", rating=40,
                body=2, acidity=2, sweetness=2, tannin=2,
            )
            if wine == self.cabernet_target:
                WineReviewImage.objects.create(review=review, image="review_images/decoy.jpg")
        self.cabernet_review = WineReview.objects.create(
            wine=self.cabernet_source, user=self.user, text="Cabernet from generic name", rating=45,
            body=2, acidity=2, sweetness=2, tannin=2,
        )
        WineReviewImage.objects.create(review=self.cabernet_review, image="review_images/source-decoy.jpg")

    def test_merges_reviews_redirects_favorites_and_cover_image(self):
        original_review_count = WineReview.objects.count()
        with patch.object(Command, "_backup") as backup:
            call_command("merge_reviewed_decoy_wines", "--apply", "--backup-path", "unused-test-backup.sqlite3")
            call_command("merge_reviewed_decoy_wines", "--apply", "--backup-path", "unused-test-backup.sqlite3")
            backup.assert_called_once()

        self.merlot_target.refresh_from_db()
        self.merlot_source.refresh_from_db()
        self.cabernet_target.refresh_from_db()
        self.cabernet_source.refresh_from_db()
        self.assertEqual(self.merlot_target.kor_name, "디코이 메를로")
        self.assertEqual(self.merlot_target.eng_name, "Decoy Merlot")
        self.assertIn("Decoy sonoma county Merlot", self.merlot_target.search_aliases)
        self.assertEqual(self.cabernet_target.image_url, "https://example.com/cabernet.jpg")
        self.assertFalse(self.merlot_source.catalog_visible)
        self.assertEqual(self.merlot_source.canonical_wine_id, 4816)
        self.assertFalse(self.cabernet_source.catalog_visible)
        self.assertEqual(self.cabernet_source.canonical_wine_id, 8437)
        self.assertEqual(Wine.objects.get(pk=1010).canonical_wine_id, 4816)
        self.assertEqual(Wine.objects.get(pk=3216).canonical_wine_id, 8437)
        self.assertEqual(WineReview.objects.count(), original_review_count)
        self.assertEqual(WineReview.objects.filter(wine_id=4816).count(), 3)
        self.assertEqual(WineReview.objects.filter(wine_id=8437).count(), 2)
        self.cabernet_review.refresh_from_db()
        self.assertEqual(self.cabernet_review.wine_id, 8437)
        self.assertEqual(self.cabernet_review.images.count(), 1)
        self.assertEqual(set(self.user.favorite_wines.values_list("id", flat=True)), {4816, 8437})
        self.assertEqual(self.client.get("/api/wines/5803/").data["id"], 4816)
        self.assertEqual(self.client.get("/api/wines/8010/").data["id"], 8437)
        search = self.client.get("/api/wines/", {"q": "Decoy"})
        self.assertEqual({item["id"] for item in search.data["results"]}, {4816, 8437})

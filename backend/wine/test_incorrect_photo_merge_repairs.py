import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from user.models import User
from wine.management.commands import repair_incorrect_photo_merges
from wine.models import Country, GrapeVariety, Wine, WineReview, WineReviewImage
from wine.verified_catalog_merges import CANONICAL_ENGLISH_NAMES, CANONICAL_KOREAN_NAMES


class IncorrectPhotoMergeRepairTests(TestCase):
    def test_original_review_ids_and_wines_are_restored_without_losing_images(self):
        country = Country.objects.create(kor_name="Test country", eng_name="Test country")
        Shiraz = GrapeVariety.objects.create(kor_name="쉬라", eng_name="Syrah/Shiraz")
        Cabernet = GrapeVariety.objects.create(kor_name="카베르네 소비뇽", eng_name="Cabernet Sauvignon")
        old_rows = (
            (5777, "Federico Paternina Cava", "페데리코 파테르니나 까바",
             "Federico Paternina Cava, 페데리코 파테르니나 까바", "sparkling"),
            (8369, "Federico paternina Cava Brut", "페데리코 파테르니나 까바 브뤼",
             "Federico paternina Cava Brut, 페데리코 파테르니나 까바 브뤼", "sparkling"),
            (5658, "penfolds koonunga hill shiraz", "펜폴즈 쿠눈가힐 쉬라",
             "penfolds koonunga hill shiraz, 펜폴즈 쿠눈가힐 쉬라, "
             "penfolds koonunga hill shiraz, 펜폴즈 쿠눈가힐 쉬라", "red"),
            (5368, "Penfolds Koonunga Hill Shiraz", "팬폴즈 쿠눈가힐 쉬라",
             "Penfolds Koonunga Hill Shiraz, 펜폴즈 쿠눈가힐 쉬라", "red"),
        )
        wine_by_id = {}
        for wine_id, eng_name, kor_name, aliases, wine_type in old_rows:
            wine_by_id[wine_id] = Wine.objects.create(
                id=wine_id, eng_name=eng_name, kor_name=kor_name,
                search_aliases=aliases, type=wine_type, country=country,
            )
        for source_id, target_id in ((5777, 8369), (5658, 5368)):
            source = wine_by_id[source_id]
            target = wine_by_id[target_id]
            source.catalog_visible = False
            source.canonical_wine = target
            source.save(update_fields=["catalog_visible", "canonical_wine"])
            target.search_aliases = repair_incorrect_photo_merges.aliases_after_old_merge(
                (target.eng_name, target.kor_name, target.search_aliases),
                (source.eng_name, source.kor_name, source.search_aliases),
            )
            target.save(update_fields=["search_aliases"])

        user = User.objects.create_user(
            email="photo-repair-test@example.com", password="test-password", nickname="Photo repair"
        )
        for review_id, target_id in ((987, 8369), (863, 5368)):
            review = WineReview.objects.create(
                id=review_id, wine=wine_by_id[target_id], user=user, text="Original review",
                rating=40, body=2, acidity=2, sweetness=2, tannin=2,
            )
            WineReviewImage.objects.create(review=review, image=f"review_images/{review_id}.jpg")

        with tempfile.TemporaryDirectory() as temporary:
            original_backup = Path(temporary) / "original.sqlite3"
            with closing(sqlite3.connect(original_backup)) as snapshot:
                snapshot.execute(
                    "CREATE TABLE wine_wine (id INTEGER PRIMARY KEY, catalog_visible INTEGER, "
                    "canonical_wine_id INTEGER, eng_name TEXT, kor_name TEXT, search_aliases TEXT)"
                )
                snapshot.execute("CREATE TABLE wine_winereview (id INTEGER PRIMARY KEY, wine_id INTEGER)")
                snapshot.execute(
                    f"CREATE TABLE {User.favorite_wines.through._meta.db_table} "
                    "(user_id INTEGER, wine_id INTEGER)"
                )
                for wine_id, eng_name, kor_name, aliases, _ in old_rows:
                    snapshot.execute(
                        "INSERT INTO wine_wine VALUES (?, 1, NULL, ?, ?, ?)",
                        (wine_id, eng_name, kor_name, aliases),
                    )
                snapshot.executemany(
                    "INSERT INTO wine_winereview VALUES (?, ?)", ((987, 5777), (863, 5658))
                )
                snapshot.commit()

            with patch.object(repair_incorrect_photo_merges.Command, "_backup") as backup:
                arguments = (
                    "repair_incorrect_photo_merges", "--original-backup", str(original_backup),
                    "--apply", "--backup-path", str(Path(temporary) / "before-repair.sqlite3"),
                )
                call_command(*arguments)
                call_command(*arguments)
                backup.assert_called_once()

        for source_id, _ in ((5777, 8369), (5658, 5368)):
            source = Wine.objects.get(id=source_id)
            self.assertTrue(source.catalog_visible)
            self.assertIsNone(source.canonical_wine_id)
            self.assertEqual(source.eng_name, CANONICAL_ENGLISH_NAMES[source_id])
            self.assertEqual(source.kor_name, CANONICAL_KOREAN_NAMES[source_id])
        self.assertEqual(WineReview.objects.get(id=987).wine_id, 5777)
        self.assertEqual(WineReview.objects.get(id=863).wine_id, 5658)
        self.assertEqual(WineReviewImage.objects.count(), 2)
        self.assertEqual(
            set(Wine.objects.get(id=5658).grape_varieties.values_list("id", flat=True)),
            {Shiraz.id, Cabernet.id},
        )
        self.assertEqual(
            Wine.objects.get(id=8369).search_aliases,
            "Federico paternina Cava Brut, 페데리코 파테르니나 까바 브뤼",
        )

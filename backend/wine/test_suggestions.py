from django.test import TestCase
from rest_framework.test import APIClient

from user.models import User
from wine.models import Country, GrapeVariety, Wine, WineDuplicateCandidate
from wine.suggestions import normalized_name, queue_duplicate_candidates, suggestion_score


class WineSuggestionTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(
            email="suggestion@example.com", password="test-password", nickname="Reviewer",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=user)

    def test_accent_and_punctuation_variants_find_existing_wine(self):
        france = Country.objects.create(kor_name="프랑스", eng_name="France")
        wine = Wine.objects.create(
            kor_name="샤또 몽페라", eng_name="Château Mont-Pérat", type="red",
            country=france, image_url="https://example.com/mont-perat.jpg",
        )
        response = self.client.get("/api/wines/suggestions/", {
            "nameEng": "Chateau Mont Perat", "nameKr": "샤또몽페라",
            "wineType": "Red", "regions": "프랑스",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["id"], wine.id)
        self.assertEqual(response.data["results"][0]["imageUrl"], wine.image_url)
        self.assertEqual(response.data["results"][0]["regions"], "프랑스")

    def test_korean_name_without_spaces_and_old_alias_both_find_wine(self):
        wine = Wine.objects.create(
            kor_name="샤또 몽페라", eng_name="Château Mont-Pérat", type="red",
            search_aliases="Mont Perat, 샤토 몽페라",
        )
        for params in ({"nameKr": "샤또몽페라"}, {"nameEng": "Mont Perat"}):
            with self.subTest(params=params):
                response = self.client.get("/api/wines/suggestions/", params)
                self.assertEqual([result["id"] for result in response.data["results"]], [wine.id])

    def test_two_syllable_korean_input_finds_candidates_without_english(self):
        wines = [Wine.objects.create(
            kor_name=f"샤토 르 게이 {index}", eng_name=f"Chateau Le Gay {index}", type="red",
        ) for index in range(6)]
        response = self.client.get("/api/wines/suggestions/", {"nameKr": "샤또"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["results"]), 5)
        self.assertTrue(all(item["id"] in {wine.pk for wine in wines} for item in response.data["results"]))

    def test_korean_query_ignores_spacing_and_chateau_spelling(self):
        wine = Wine.objects.create(
            kor_name="샤토 르 게이", eng_name="Chateau Le Gay", type="red",
        )
        response = self.client.get("/api/wines/suggestions/", {"nameKr": "샤또르게이"})
        self.assertEqual([item["id"] for item in response.data["results"]], [wine.pk])

    def test_hidden_merged_wines_are_not_suggested(self):
        canonical = Wine.objects.create(
            kor_name="새 이름", eng_name="New Name", type="red",
        )
        Wine.objects.create(
            kor_name="옛 이름", eng_name="Old Name", type="red",
            catalog_visible=False, canonical_wine=canonical,
        )
        response = self.client.get("/api/wines/suggestions/", {"nameEng": "Old Name"})
        self.assertEqual(response.data["results"], [])

    def test_short_name_returns_empty_and_anonymous_request_is_denied(self):
        response = self.client.get("/api/wines/suggestions/", {"nameKr": "와"})
        self.assertEqual(response.data["results"], [])
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/wines/suggestions/", {"nameEng": "Chateau"})
        self.assertEqual(response.status_code, 401)

    def test_matching_uses_name_before_type_and_country(self):
        self.assertEqual(normalized_name("Château Mont-Pérat"), "chateaumontperat")
        self.assertGreater(
            suggestion_score("Chateau Mont Perat", "", "Château Mont-Pérat", "", wine_type="white", candidate_type="red"),
            0.9,
        )
        self.assertEqual(suggestion_score("Completely Different", "", "Château Mont-Pérat", ""), 0)

    def test_shared_grape_name_does_not_queue_other_producers(self):
        country = Country.objects.create(kor_name="뉴질랜드", eng_name="New Zealand")
        grape = GrapeVariety.objects.create(kor_name="소비뇽 블랑", eng_name="Sauvignon Blanc")
        source = Wine.objects.create(
            kor_name="티라키 소비뇽블랑", eng_name="TIRAKI sauvignon blanc",
            type="white", country=country,
        )
        source.grape_varieties.add(grape)
        for eng, kor in (
            ("Tapi, Sauvignon Blanc", "타피, 소비뇽블랑"),
            ("Babich sauvignon blanc", "배비치 소비뇽블랑"),
            ("Kono, Sauvignon Blanc", "코노 소비뇽블랑"),
            ("Mission Estate, Sauvignon Blanc", "미션 에스테이트 소비뇽블랑"),
            ("CLOUDY BAY Sauvignon Blanc", "클라우디 베이 소비뇽블랑"),
        ):
            wine = Wine.objects.create(kor_name=kor, eng_name=eng, type="white", country=country)
            wine.grape_varieties.add(grape)
        self.assertGreater(suggestion_score(source.eng_name, source.kor_name, "Tapi, Sauvignon Blanc", "타피, 소비뇽블랑"), 0.85)

        queue_duplicate_candidates(source)

        self.assertFalse(WineDuplicateCandidate.objects.filter(source=source).exists())

    def test_brand_typo_still_queues_a_candidate(self):
        grape = GrapeVariety.objects.create(kor_name="소비뇽 블랑", eng_name="Sauvignon Blanc")
        existing = Wine.objects.create(
            kor_name="티라키 소비뇽 블랑", eng_name="Tiraki Sauvignon Blanc", type="white",
        )
        existing.grape_varieties.add(grape)
        new = Wine.objects.create(
            kor_name="티라키 소비뇽 블랑", eng_name="Tirakki Sauvignon Blanc", type="white",
        )
        new.grape_varieties.add(grape)

        queue_duplicate_candidates(new)

        candidate = WineDuplicateCandidate.objects.get(source=new, target=existing)
        self.assertIsNone(candidate.image_score)
        self.assertGreaterEqual(candidate.score, 0.82)

    def test_shared_grape_without_selected_metadata_still_does_not_queue(self):
        Wine.objects.create(
            kor_name="타피 소비뇽 블랑", eng_name="Tapi Sauvignon Blanc", type="white",
        )
        source = Wine.objects.create(
            kor_name="티라키 소비뇽 블랑", eng_name="Tiraki Sauvignon Blanc", type="white",
        )

        queue_duplicate_candidates(source)

        self.assertFalse(WineDuplicateCandidate.objects.filter(source=source).exists())

    def test_old_name_alias_can_still_queue_a_candidate(self):
        existing = Wine.objects.create(
            kor_name="새 표기", eng_name="New Label", type="red",
            search_aliases="Chateau Mont Perat, 샤토 몽페라",
        )
        source = Wine.objects.create(
            kor_name="샤토 몽페라", eng_name="Chateau Mont-Perat", type="red",
        )

        queue_duplicate_candidates(source)

        self.assertTrue(WineDuplicateCandidate.objects.filter(source=source, target=existing).exists())

    def test_shared_producer_but_different_label_is_not_queued(self):
        grape = GrapeVariety.objects.create(kor_name="소비뇽 블랑", eng_name="Sauvignon Blanc")
        standard = Wine.objects.create(
            kor_name="클라우디 베이 소비뇽 블랑", eng_name="Cloudy Bay Sauvignon Blanc", type="white",
        )
        special = Wine.objects.create(
            kor_name="클라우디 베이 테 코코 소비뇽 블랑", eng_name="Cloudy Bay Te Koko Sauvignon Blanc", type="white",
        )
        standard.grape_varieties.add(grape)
        special.grape_varieties.add(grape)

        queue_duplicate_candidates(special)

        self.assertFalse(WineDuplicateCandidate.objects.filter(source=special).exists())

from django.test import TestCase
from rest_framework.test import APIClient

from user.models import User
from wine.models import Country, Wine
from wine.suggestions import normalized_name, suggestion_score


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

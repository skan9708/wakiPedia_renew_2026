from django.test import TestCase
from rest_framework.test import APIClient

from user.models import User
from wine.models import Country, GrapeVariety, Wine


class CatalogTermApprovalTests(TestCase):
    def setUp(self):
        self.member = User.objects.create_user(
            email="catalog-member@example.com", password="test-password", nickname="Member",
        )
        self.staff = User.objects.create_user(
            email="catalog-staff@example.com", password="test-password", nickname="Staff", is_staff=True,
        )
        self.member_client = APIClient()
        self.member_client.force_authenticate(user=self.member)
        self.staff_client = APIClient()
        self.staff_client.force_authenticate(user=self.staff)

    def create_wine(self, **extra):
        data = {
            "nameKr": "새 와인", "nameEng": "New Wine", "wineType": "Red",
            "regions": "새 원산지", "breeds": "새 품종, 다른 새 품종",
        }
        data.update(extra)
        response = self.member_client.post("/api/wines/", data, format="json")
        self.assertEqual(response.status_code, 201)
        return Wine.objects.get(pk=response.data["id"])

    def test_new_terms_wait_for_staff_and_rejection_detaches_them(self):
        wine = self.create_wine()
        country = wine.country
        grape = GrapeVariety.objects.get(kor_name="새 품종")
        self.assertFalse(country.is_approved)
        self.assertFalse(grape.is_approved)

        filters = self.member_client.get("/api/wines/filters/").data
        self.assertNotIn(country.kor_name, filters["countries"])
        self.assertNotIn(grape.kor_name, filters["breeds"])

        pending = self.staff_client.get("/api/admin/catalog-terms/")
        self.assertEqual(pending.status_code, 200)
        self.assertEqual(pending.data["total"], 3)
        self.assertTrue(all(item["wineCount"] == 1 for item in pending.data["results"]))

        approved = self.staff_client.patch(
            f"/api/admin/catalog-terms/country/{country.pk}/", {"approved": True}, format="json",
        )
        self.assertEqual(approved.status_code, 200)
        self.assertTrue(Country.objects.get(pk=country.pk).is_approved)
        self.assertIn(country.kor_name, self.member_client.get("/api/wines/filters/").data["countries"])

        rejected = self.staff_client.patch(
            f"/api/admin/catalog-terms/grape/{grape.pk}/", {"approved": False}, format="json",
        )
        self.assertEqual(rejected.status_code, 200)
        self.assertFalse(GrapeVariety.objects.filter(pk=grape.pk).exists())
        self.assertNotIn("새 품종", list(wine.grape_varieties.values_list("kor_name", flat=True)))
        self.assertEqual(self.staff_client.get("/api/admin/catalog-terms/").data["total"], 1)

    def test_existing_terms_are_reused_and_member_cannot_approve(self):
        country = Country.objects.create(kor_name="프랑스", eng_name="France")
        grape = GrapeVariety.objects.create(kor_name="메를로", eng_name="Merlot")
        wine = self.create_wine(regions="France", breeds="Merlot, 메를로")
        self.assertEqual(wine.country_id, country.pk)
        self.assertEqual(list(wine.grape_varieties.values_list("id", flat=True)), [grape.pk])
        self.assertEqual(self.staff_client.get("/api/admin/catalog-terms/").data["total"], 0)
        self.assertIn("프랑스", self.member_client.get("/api/wines/filters/").data["countries"])
        self.assertEqual(self.member_client.get("/api/admin/catalog-terms/").status_code, 403)

    def test_pending_term_is_reused_instead_of_added_twice(self):
        first = self.create_wine()
        second = self.create_wine(nameKr="두 번째 와인", nameEng="Second Wine")
        self.assertEqual(first.country_id, second.country_id)
        self.assertEqual(GrapeVariety.objects.filter(kor_name="새 품종").count(), 1)
        pending = self.staff_client.get("/api/admin/catalog-terms/").data["results"]
        self.assertTrue(all(item["wineCount"] == 2 for item in pending))

    def test_country_buttons_are_ordered_by_visible_wine_count(self):
        france = Country.objects.create(kor_name="프랑스", eng_name="France")
        italy = Country.objects.create(kor_name="이탈리아", eng_name="Italy")
        greece = Country.objects.create(kor_name="그리스", eng_name="Greece")
        pending = Country.objects.create(kor_name="미승인", eng_name="Pending", is_approved=False)
        for index in range(3):
            Wine.objects.create(kor_name=f"프랑스 와인 {index}", eng_name=f"French {index}", country=france)
        for index in range(2):
            Wine.objects.create(kor_name=f"이탈리아 와인 {index}", eng_name=f"Italian {index}", country=italy)
        Wine.objects.create(kor_name="숨긴 와인", eng_name="Hidden Wine", country=greece, catalog_visible=False)
        Wine.objects.create(kor_name="승인 대기 와인", eng_name="Pending Wine", country=pending)

        countries = self.member_client.get("/api/wines/filters/").data["countries"]
        self.assertEqual(countries[:3], ["프랑스", "이탈리아", "그리스"])
        self.assertNotIn("미승인", countries)

    def test_grape_buttons_are_ordered_by_visible_wine_count(self):
        syrah = GrapeVariety.objects.create(kor_name="Syrah", eng_name="Syrah")
        merlot = GrapeVariety.objects.create(kor_name="Merlot", eng_name="Merlot")
        cabernet = GrapeVariety.objects.create(kor_name="Cabernet", eng_name="Cabernet")
        pending = GrapeVariety.objects.create(kor_name="Pending", eng_name="Pending", is_approved=False)

        for index in range(3):
            wine = Wine.objects.create(kor_name=f"Syrah Wine {index}", eng_name=f"Syrah {index}")
            wine.grape_varieties.add(syrah)
            if index < 2:
                wine.grape_varieties.add(merlot)

        hidden = Wine.objects.create(kor_name="Hidden Wine", eng_name="Hidden Wine", catalog_visible=False)
        hidden.grape_varieties.add(cabernet)
        pending_wine = Wine.objects.create(kor_name="Pending Wine", eng_name="Pending Wine")
        pending_wine.grape_varieties.add(pending)

        breeds = self.member_client.get("/api/wines/filters/").data["breeds"]
        self.assertEqual(breeds[:3], ["Syrah", "Merlot", "Cabernet"])
        self.assertNotIn("Pending", breeds)

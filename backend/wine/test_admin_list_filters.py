from datetime import datetime
from io import BytesIO

from django.test import TestCase
from openpyxl import load_workbook
from rest_framework.test import APIClient

from user.models import User
from wine.models import Country, Wine, WineReview


class AdminListFilterTests(TestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            email="staff-list@example.com", password="test-password", nickname="Staff", is_staff=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.staff)

    def test_wines_sort_by_review_count_before_pagination_and_filter_dates(self):
        older = Wine.objects.create(kor_name="이전 와인", eng_name="Older Wine", type="red")
        newer = Wine.objects.create(kor_name="새 와인", eng_name="New Wine", type="white", bubble_avg_rating=4.0)
        Wine.objects.filter(pk=older.pk).update(created_at=datetime(2026, 1, 2))
        Wine.objects.filter(pk=newer.pk).update(created_at=datetime(2026, 2, 2))
        for number in range(2):
            WineReview.objects.create(wine=older, user=self.staff, text=f"Review {number}", rating=40)

        sorted_page = self.client.get("/api/admin/wines/", {"sort": "reviews_desc", "limit": 1})
        self.assertEqual(sorted_page.data["total"], 2)
        self.assertEqual(sorted_page.data["results"][0]["id"], older.pk)
        self.assertEqual(sorted_page.data["results"][0]["reviewCount"], 2)
        rating_page = self.client.get("/api/admin/wines/", {"sort": "rating_desc", "limit": 1})
        self.assertEqual(rating_page.data["results"][0]["id"], newer.pk)
        filtered = self.client.get("/api/admin/wines/", {
            "type": "white", "date_from": "2026-02-01", "date_to": "2026-02-28",
        })
        self.assertEqual([item["id"] for item in filtered.data["results"]], [newer.pk])

    def test_reviews_filter_visibility_and_sort_helpfulness_across_pages(self):
        wine = Wine.objects.create(kor_name="테스트 와인", eng_name="Test Wine")
        older = WineReview.objects.create(wine=wine, user=self.staff, text="Useful", rating=40, is_public=True)
        newer = WineReview.objects.create(wine=wine, user=self.staff, text="Private", rating=45, is_public=False)
        WineReview.objects.filter(pk=older.pk).update(created_at=datetime(2026, 1, 2))
        WineReview.objects.filter(pk=newer.pk).update(created_at=datetime(2026, 2, 2))
        voter = User.objects.create_user(email="voter-list@example.com", password="test-password", nickname="Voter")
        older.likes.add(voter)

        sorted_page = self.client.get("/api/admin/reviews/", {"sort": "helpful_desc", "limit": 1})
        self.assertEqual(sorted_page.data["results"][0]["id"], older.pk)
        filtered = self.client.get("/api/admin/reviews/", {
            "visibility": "private", "date_from": "2026-02-01", "date_to": "2026-02-28",
        })
        self.assertEqual([item["id"] for item in filtered.data["results"]], [newer.pk])

    def test_users_sort_by_review_count_and_filter_signup_date(self):
        older = User.objects.create_user(email="older-list@example.com", password="test-password", nickname="Older")
        newer = User.objects.create_user(email="newer-list@example.com", password="test-password", nickname="Newer")
        User.objects.filter(pk=older.pk).update(created_at=datetime(2026, 1, 2))
        User.objects.filter(pk=newer.pk).update(created_at=datetime(2026, 2, 2))
        wine = Wine.objects.create(kor_name="기록 와인", eng_name="Review Wine")
        for number in range(2):
            WineReview.objects.create(wine=wine, user=older, text=f"Review {number}", rating=40)

        sorted_page = self.client.get("/api/admin/users/", {"sort": "reviews_desc", "role": "member", "limit": 1})
        self.assertEqual(sorted_page.data["results"][0]["id"], older.pk)
        self.assertEqual(sorted_page.data["results"][0]["reviewCount"], 2)
        filtered = self.client.get("/api/admin/users/", {
            "role": "member", "status": "active", "date_from": "2026-02-01", "date_to": "2026-02-28",
        })
        self.assertEqual([item["id"] for item in filtered.data["results"]], [newer.pk])

    def test_exact_column_filters_and_excel_export_include_all_matching_rows(self):
        us = Country.objects.create(kor_name="미국", eng_name="United States")
        france = Country.objects.create(kor_name="프랑스", eng_name="France")
        first = Wine.objects.create(kor_name="미국 와인 하나", eng_name="US One", type="red", country=us)
        second = Wine.objects.create(kor_name="미국 와인 둘", eng_name="US Two", type="white", country=us)
        Wine.objects.create(kor_name="프랑스 와인", eng_name="FR One", type="red", country=france)
        first_review = WineReview.objects.create(wine=first, user=self.staff, text="=1+1", rating=10)
        WineReview.objects.create(wine=second, user=self.staff, text="두 번째 리뷰", rating=10)
        WineReview.objects.create(wine=first, user=self.staff, text="다른 평점", rating=20)

        options = self.client.get("/api/admin/wines/", {"options": 1})
        self.assertEqual(options.status_code, 200)
        self.assertIn("미국", options.data["countries"])
        self.assertIn("red", options.data["types"])

        wines = self.client.get("/api/admin/wines/", {"country": "미국", "limit": 1})
        self.assertEqual(wines.data["total"], 2)
        self.assertEqual(len(wines.data["results"]), 1)
        wine_export = self.client.get("/api/admin/wines/", {"country": "미국", "limit": 1, "export": "xlsx"})
        self.assertEqual(wine_export.status_code, 200)
        wine_sheet = load_workbook(BytesIO(wine_export.content), read_only=False).active
        self.assertEqual(wine_sheet.max_row, 3)
        self.assertEqual({wine_sheet.cell(row, 1).value for row in (2, 3)}, {first.pk, second.pk})
        self.assertEqual(wine_sheet.auto_filter.ref, "A1:H3")

        reviews = self.client.get("/api/admin/reviews/", {"rating": "1.0", "limit": 1})
        self.assertEqual(reviews.data["total"], 2)
        review_export = self.client.get("/api/admin/reviews/", {"rating": "1.0", "limit": 1, "export": "xlsx"})
        self.assertEqual(review_export.status_code, 200)
        review_sheet = load_workbook(BytesIO(review_export.content), read_only=False).active
        self.assertEqual(review_sheet.max_row, 3)
        formula_cell = next(review_sheet.cell(row, 7) for row in (2, 3) if review_sheet.cell(row, 1).value == first_review.pk)
        self.assertEqual(formula_cell.value, "=1+1")
        self.assertEqual(formula_cell.data_type, "s")

        users = self.client.get("/api/admin/users/", {"review_count": 3, "export": "xlsx"})
        self.assertEqual(users.status_code, 200)
        user_sheet = load_workbook(BytesIO(users.content), read_only=False).active
        self.assertEqual(user_sheet.max_row, 2)
        self.assertEqual(user_sheet.cell(2, 1).value, self.staff.pk)

    def test_excel_export_requires_staff(self):
        member = User.objects.create_user(email="member-list@example.com", password="test-password", nickname="Member")
        self.client.force_authenticate(user=member)
        for path in ("wines", "reviews", "users"):
            self.assertEqual(self.client.get(f"/api/admin/{path}/", {"export": "xlsx"}).status_code, 403)

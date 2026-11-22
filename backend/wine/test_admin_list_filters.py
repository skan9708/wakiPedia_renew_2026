from datetime import datetime

from django.test import TestCase
from rest_framework.test import APIClient

from user.models import User
from wine.models import Wine, WineReview


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

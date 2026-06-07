from django.urls import path
from wine import review_views

urlpatterns = [
    path("", review_views.ReviewListView.as_view(), name="review-list"),
    path("<int:pk>/", review_views.ReviewDetailView.as_view(), name="review-detail"),
    path("<int:pk>/like/", review_views.ReviewLikeView.as_view(), name="review-like"),
]

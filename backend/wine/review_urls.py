from django.urls import path
from wine import review_views
from wine.review_images import PrivateReviewPhotoView

urlpatterns = [
    path("photos/<int:pk>/", PrivateReviewPhotoView.as_view(), name="private-review-photo"),
    path("", review_views.ReviewListView.as_view(), name="review-list"),
    path("<int:pk>/", review_views.ReviewDetailView.as_view(), name="review-detail"),
    path("<int:pk>/like/", review_views.ReviewLikeView.as_view(), name="review-like"),
]

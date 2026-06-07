from django.urls import path
from user import me_views

urlpatterns = [
    path("", me_views.MeView.as_view(), name="me"),
    path("reviews/", me_views.MyReviewsView.as_view(), name="my-reviews"),
    path("likes/", me_views.MyLikesView.as_view(), name="my-likes"),
]

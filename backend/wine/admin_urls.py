from django.urls import path
from wine.admin_views import (
    AdminWineListView, AdminWineDetailView,
    AdminReviewListView, AdminReviewDetailView,
    AdminTagListView, AdminTagDetailView,
)
from user.admin_views import AdminUserListView, AdminUserDetailView

urlpatterns = [
    path("wines/", AdminWineListView.as_view()),
    path("wines/<int:pk>/", AdminWineDetailView.as_view()),
    path("reviews/", AdminReviewListView.as_view()),
    path("reviews/<int:pk>/", AdminReviewDetailView.as_view()),
    path("tags/", AdminTagListView.as_view()),
    path("tags/<int:pk>/", AdminTagDetailView.as_view()),
    path("users/", AdminUserListView.as_view()),
    path("users/<int:pk>/", AdminUserDetailView.as_view()),
]

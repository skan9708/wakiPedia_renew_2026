from django.urls import path
from user import me_views
from user import recovery_views

urlpatterns = [
    path("", me_views.MeView.as_view(), name="me"),
    path("reviews/", me_views.MyReviewsView.as_view(), name="my-reviews"),
    path("likes/", me_views.MyLikesView.as_view(), name="my-likes"),
    path("phone/send/", recovery_views.LinkPhoneSendView.as_view()),
    path("phone/verify/", recovery_views.LinkPhoneVerifyView.as_view()),
    path("phone/", recovery_views.RemovePhoneView.as_view()),
]

from django.urls import path

from feedback.views import FeedbackCreateView


urlpatterns = [path("", FeedbackCreateView.as_view())]

from django.urls import path
from wine import tag_views

urlpatterns = [
    path("", tag_views.TagListView.as_view(), name="tag-list"),
]

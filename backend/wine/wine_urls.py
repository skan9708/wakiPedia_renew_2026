from django.urls import path
from wine import wine_views

urlpatterns = [
    path("", wine_views.WineListView.as_view(), name="wine-list"),
    path("filters/", wine_views.WineFiltersView.as_view(), name="wine-filters"),
    path("<int:pk>/", wine_views.WineDetailView.as_view(), name="wine-detail"),
    path("<int:pk>/favorite/", wine_views.WineFavoriteView.as_view(), name="wine-favorite"),
]

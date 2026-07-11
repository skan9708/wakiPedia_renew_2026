from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("user.urls")),
    path("api/wines/", include("wine.wine_urls")),
    path("api/reviews/", include("wine.review_urls")),
    path("api/tags/", include("wine.tag_urls")),
    path("api/me/", include("user.me_urls")),
    path("api/admin/", include("wine.admin_urls")),
]

if settings.DEBUG:
    from drf_spectacular.views import (
        SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
    )
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/swagger/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
        path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    ]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

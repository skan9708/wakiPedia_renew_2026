from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import OuterRef, Q, Subquery

from wine.models import Wine, Country, GrapeVariety
from wine.catalog_terms import resolve_catalog_term
from wine.image_utils import public_review_image_names, wine_display_image_url
from wine.serializers import WineListSerializer, WineDetailSerializer
from wine.suggestions import has_searchable_name, search_hints, suggestion_score


class WineListView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        qs = Wine.objects.filter(catalog_visible=True).select_related("country").prefetch_related("grape_varieties")

        q = request.query_params.get("q")
        wine_type = request.query_params.get("type")
        country = request.query_params.get("country")
        breed = request.query_params.get("breed")
        sort = request.query_params.get("sort", "latest")

        if q:
            qs = qs.filter(
                Q(kor_name__icontains=q)
                | Q(eng_name__icontains=q)
                | Q(search_aliases__icontains=q)
            )
        if wine_type:
            type_map = {"Red": "red", "White": "white", "Sparkling": "sparkling", "Rose": "rose"}
            qs = qs.filter(type=type_map.get(wine_type, wine_type.lower()))
        if country:
            qs = qs.filter(country__kor_name__icontains=country)
        if breed:
            qs = qs.filter(grape_varieties__kor_name__icontains=breed)

        if sort == "rating_desc":
            from django.db.models import Avg
            qs = qs.annotate(avg_rating=Avg("reviews__rating")).order_by("-avg_rating")
        elif sort == "rating_asc":
            from django.db.models import Avg
            qs = qs.annotate(avg_rating=Avg("reviews__rating")).order_by("avg_rating")
        else:
            qs = qs.order_by("-created_at")

        qs = qs.distinct()

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            limit = min(100, max(1, int(request.query_params.get("limit", 20))))
        except ValueError:
            page, limit = 1, 20

        total = qs.count()
        start = (page - 1) * limit
        end = start + limit
        page_wines = qs[start:end].annotate(
            review_cover_image=Subquery(public_review_image_names(OuterRef("pk"))[:1])
        )
        serializer = WineListSerializer(page_wines, many=True, context={"request": request})
        return Response({
            "results": serializer.data,
            "total": total,
            "page": page,
            "hasNext": end < total,
        })

    @transaction.atomic
    def post(self, request):
        name_kr = (request.data.get("nameKr") or "").strip()
        name_eng = (request.data.get("nameEng") or "").strip()
        wine_type = request.data.get("wineType", "").lower()
        country_name = (request.data.get("regions") or "").strip()
        breeds = request.data.get("breeds", [])
        image = request.FILES.get("image")

        if not name_kr or not name_eng or not wine_type:
            return Response(
                {"detail": "nameKr, nameEng, wineType은 필수 입력 항목입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if isinstance(breeds, str):
            breeds = [b.strip() for b in breeds.split(",") if b.strip()]
        if (len(name_kr) > 255 or len(name_eng) > 255 or len(country_name) > 255
                or len(breeds) > 20 or any(len(breed) > 255 for breed in breeds)):
            return Response({"detail": "이름은 255자 이내, 품종은 20개 이내로 입력해 주세요."}, status=400)

        country = resolve_catalog_term(Country, country_name, approved=request.user.is_staff)

        wine = Wine.objects.create(
            kor_name=name_kr,
            eng_name=name_eng,
            type=wine_type,
            country=country,
            image=image,
            registered_by=request.user,
        )

        for breed_name in breeds:
            gv = resolve_catalog_term(GrapeVariety, breed_name, approved=request.user.is_staff)
            wine.grape_varieties.add(gv)

        serializer = WineListSerializer(wine, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class WineSuggestionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        name_eng = (request.query_params.get("nameEng") or "").strip()[:255]
        name_kr = (request.query_params.get("nameKr") or "").strip()[:255]
        if not has_searchable_name(name_eng, name_kr):
            return Response({"results": []})

        wine_type = (request.query_params.get("wineType") or "").strip().lower()
        country = (request.query_params.get("regions") or "").strip()[:255]
        candidates = {}
        for hint in search_hints(name_eng, name_kr):
            matches = (
                Wine.objects.filter(catalog_visible=True)
                .filter(
                    Q(eng_name__icontains=hint)
                    | Q(kor_name__icontains=hint)
                    | Q(search_aliases__icontains=hint)
                )
                .values_list("id", "eng_name", "kor_name", "search_aliases", "type", "country__kor_name")
                .order_by("-id")[:150]
            )
            for row in matches:
                candidates[row[0]] = row

        ranked = []
        for wine_id, candidate_eng, candidate_kr, aliases, candidate_type, candidate_country in candidates.values():
            score = suggestion_score(
                name_eng, name_kr, candidate_eng, candidate_kr, aliases,
                wine_type, candidate_type, country, candidate_country,
            )
            if score:
                ranked.append((score, wine_id))
        ranked.sort(reverse=True)
        ids = [wine_id for _, wine_id in ranked[:5]]
        wines = Wine.objects.filter(pk__in=ids).select_related("country").annotate(
            review_cover_image=Subquery(public_review_image_names(OuterRef("pk"))[:1])
        ).in_bulk()
        results = [{
            "id": wine.pk,
            "nameEng": wine.eng_name,
            "nameKr": wine.kor_name,
            "wineType": wine.type,
            "regions": wine.country.kor_name if wine.country else "",
            "imageUrl": wine_display_image_url(wine, request),
        } for wine_id in ids if (wine := wines.get(wine_id))]
        return Response({"results": results})


class WineDetailView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def _get_wine(self, pk):
        from django.shortcuts import get_object_or_404
        wine = get_object_or_404(
            Wine.objects.select_related("country").prefetch_related("grape_varieties"), pk=pk
        )
        return wine.canonical_wine or wine

    def get(self, request, pk):
        wine = self._get_wine(pk)
        serializer = WineDetailSerializer(wine, context={"request": request})
        return Response(serializer.data)

    def patch(self, request, pk):
        wine = self._get_wine(pk)
        if not (request.user.is_staff or wine.registered_by_id == request.user.pk):
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        if request.data.get("nameKr"):
            wine.kor_name = request.data["nameKr"]
        if request.data.get("nameEng"):
            wine.eng_name = request.data["nameEng"]
        if request.data.get("wineType"):
            wine.type = request.data["wineType"].lower()
        if request.data.get("regions"):
            country = resolve_catalog_term(
                Country, request.data["regions"], approved=request.user.is_staff,
            )
            wine.country = country
        if request.FILES.get("image"):
            wine.image = request.FILES["image"]
        wine.save()
        return Response(WineDetailSerializer(wine, context={"request": request}).data)

    def delete(self, request, pk):
        wine = self._get_wine(pk)
        if not request.user.is_staff:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        wine.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WineFiltersView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        from wine.models import Country, GrapeVariety
        countries = list(
            Country.objects.filter(is_approved=True).values_list("kor_name", flat=True).distinct().order_by("kor_name")
        )
        breeds = list(
            GrapeVariety.objects.filter(is_approved=True).values_list("kor_name", flat=True).distinct().order_by("kor_name")
        )
        return Response({"countries": countries, "breeds": breeds})


class WineFavoriteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        wine = get_object_or_404(Wine, pk=pk)
        wine = wine.canonical_wine or wine
        user = request.user
        if user.favorite_wines.filter(id=wine.id).exists():
            user.favorite_wines.remove(wine)
            return Response({"isFavorite": False})
        else:
            user.favorite_wines.add(wine)
            return Response({"isFavorite": True})

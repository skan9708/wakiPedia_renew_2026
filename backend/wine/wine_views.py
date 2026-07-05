from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from wine.models import Wine, Country, GrapeVariety
from wine.serializers import WineListSerializer, WineDetailSerializer


class WineListView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        qs = Wine.objects.select_related("country").prefetch_related("grape_varieties")

        q = request.query_params.get("q")
        wine_type = request.query_params.get("type")
        country = request.query_params.get("country")
        breed = request.query_params.get("breed")
        sort = request.query_params.get("sort", "latest")

        if q:
            qs = qs.filter(kor_name__icontains=q) | qs.filter(eng_name__icontains=q)
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
        serializer = WineListSerializer(qs[start:end], many=True, context={"request": request})
        return Response({
            "results": serializer.data,
            "total": total,
            "page": page,
            "hasNext": end < total,
        })

    def post(self, request):
        name_kr = request.data.get("nameKr")
        name_eng = request.data.get("nameEng")
        wine_type = request.data.get("wineType", "").lower()
        country_name = request.data.get("regions")
        breeds = request.data.get("breeds", [])
        image = request.FILES.get("image")

        if not name_kr or not name_eng or not wine_type:
            return Response(
                {"detail": "nameKr, nameEng, wineType은 필수 입력 항목입니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        country = None
        if country_name:
            country, _ = Country.objects.get_or_create(
                kor_name=country_name, defaults={"eng_name": country_name}
            )

        wine = Wine.objects.create(
            kor_name=name_kr,
            eng_name=name_eng,
            type=wine_type,
            country=country,
            image=image,
            registered_by=request.user,
        )

        if isinstance(breeds, str):
            breeds = [b.strip() for b in breeds.split(",") if b.strip()]
        for breed_name in breeds:
            gv, _ = GrapeVariety.objects.get_or_create(
                kor_name=breed_name, defaults={"eng_name": breed_name}
            )
            wine.grape_varieties.add(gv)

        serializer = WineListSerializer(wine, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class WineDetailView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def _get_wine(self, pk):
        from django.shortcuts import get_object_or_404
        return get_object_or_404(
            Wine.objects.select_related("country").prefetch_related("grape_varieties"), pk=pk
        )

    def get(self, request, pk):
        wine = self._get_wine(pk)
        serializer = WineDetailSerializer(wine, context={"request": request})
        return Response(serializer.data)

    def patch(self, request, pk):
        wine = self._get_wine(pk)
        if request.data.get("nameKr"):
            wine.kor_name = request.data["nameKr"]
        if request.data.get("nameEng"):
            wine.eng_name = request.data["nameEng"]
        if request.data.get("wineType"):
            wine.type = request.data["wineType"].lower()
        if request.data.get("regions"):
            country, _ = Country.objects.get_or_create(
                kor_name=request.data["regions"],
                defaults={"eng_name": request.data["regions"]},
            )
            wine.country = country
        if request.FILES.get("image"):
            wine.image = request.FILES["image"]
        wine.save()
        return Response(WineDetailSerializer(wine, context={"request": request}).data)

    def delete(self, request, pk):
        wine = self._get_wine(pk)
        wine.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WineFavoriteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        wine = get_object_or_404(Wine, pk=pk)
        user = request.user
        if user.favorite_wines.filter(id=wine.id).exists():
            user.favorite_wines.remove(wine)
            return Response({"isFavorite": False})
        else:
            user.favorite_wines.add(wine)
            return Response({"isFavorite": True})

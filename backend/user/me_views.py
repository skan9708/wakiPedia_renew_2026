from collections import Counter

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from user.serializers import UserSerializer, ProfileUpdateSerializer
from wine.serializers import WineListSerializer, ReviewSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user, context={"request": request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user, context={"request": request}).data)


class MyReviewsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reviews = request.user.wine_reviews.select_related("wine").prefetch_related(
            "tags", "images", "likes"
        ).order_by("-created_at")
        from wine.serializers import ReviewSerializer
        data = ReviewSerializer(reviews, many=True, context={"request": request}).data
        return Response(data)


class MyTasteProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.is_import_account:
            return Response({
                "excluded": True, "wineCount": 0, "highRatedWineCount": 0,
                "taste": None, "keywords": [],
            })

        reviews = request.user.wine_reviews.select_related(
            "wine", "wine__canonical_wine"
        ).prefetch_related("tags").order_by("-created_at", "-id")

        latest_by_wine = {}
        for review in reviews:
            wine = review.wine.canonical_wine or review.wine
            latest_by_wine.setdefault(wine.id, (review, wine))

        liked = [(review, wine) for review, wine in latest_by_wine.values() if review.rating >= 40]
        vectors = []
        keywords = Counter()
        fields = {
            "body": ("source_body", "body"),
            "sweet": ("source_sweetness", "sweetness"),
            "acid": ("source_acidity", "acidity"),
            "tanin": ("source_tannin", "tannin"),
        }

        for review, wine in liked:
            vector = {}
            for key, (source_field, review_field) in fields.items():
                source = getattr(wine, source_field)
                vector[key] = source - 1 if source is not None else getattr(review, review_field)
            if all(value is not None for value in vector.values()):
                vectors.append(vector)
            keywords.update(tag.name for tag in review.tags.all())

        taste = None
        if vectors:
            taste = {
                key: round(sum(vector[key] for vector in vectors) / len(vectors), 1)
                for key in fields
            }

        return Response({
            "excluded": False,
            "wineCount": len(vectors),
            "highRatedWineCount": len(liked),
            "taste": taste,
            "keywords": [{"text": text, "weight": weight} for text, weight in keywords.most_common(8)],
        })


class MyLikesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wines = request.user.favorite_wines.filter(catalog_visible=True)
        from wine.serializers import WineListSerializer
        data = WineListSerializer(wines, many=True, context={"request": request}).data
        return Response(data)

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


class MyLikesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        wines = request.user.favorite_wines.all()
        from wine.serializers import WineListSerializer
        data = WineListSerializer(wines, many=True, context={"request": request}).data
        return Response(data)

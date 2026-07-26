from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from wine.models import WineReview
from wine.serializers import ReviewSerializer, ReviewCreateSerializer


class ReviewListView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        qs = WineReview.objects.filter(is_public=True).select_related(
            "wine", "user"
        ).prefetch_related("tags", "images", "likes")

        wine_id = request.query_params.get("wine_id")
        sort = request.query_params.get("sort", "latest")

        if wine_id:
            qs = qs.filter(wine_id=wine_id)

        if sort == "popular":
            from django.db.models import Count
            qs = qs.annotate(like_cnt=Count("likes")).order_by("-like_cnt", "-created_at")
        else:
            qs = qs.order_by("-created_at")

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            limit = min(50, max(1, int(request.query_params.get("limit", 10))))
        except ValueError:
            page, limit = 1, 10

        total = qs.count()
        start = (page - 1) * limit
        end = start + limit
        serializer = ReviewSerializer(qs[start:end], many=True, context={"request": request})
        return Response({
            "results": serializer.data,
            "total": total,
            "page": page,
            "hasNext": end < total,
        })

    def post(self, request):
        # QueryDict repeats keys as separate entries; getlist() collects them all
        if hasattr(request.data, "getlist"):
            data = request.data.dict()
            data["feels"] = request.data.getlist("feels")
            images = request.FILES.getlist("images")
        else:
            data = dict(request.data)
            images = data.pop("images", [])

        serializer = ReviewCreateSerializer(
            data=data, context={"request": request, "images": images}
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        return Response(
            ReviewSerializer(review, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ReviewDetailView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def _get_review(self, pk):
        from django.shortcuts import get_object_or_404
        return get_object_or_404(
            WineReview.objects.select_related("wine", "user").prefetch_related(
                "tags", "images", "likes"
            ),
            pk=pk,
        )

    def get(self, request, pk):
        review = self._get_review(pk)
        serializer = ReviewSerializer(review, context={"request": request})
        return Response(serializer.data)

    def patch(self, request, pk):
        review = self._get_review(pk)
        if review.user != request.user:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

        if request.data.get("text") is not None:
            review.text = request.data["text"]
        if request.data.get("rating") is not None:
            review.rating = round(float(request.data["rating"]) * 10)
        if request.data.get("body") is not None:
            review.body = int(request.data["body"])
        if request.data.get("acidity") is not None:
            review.acidity = int(request.data["acidity"])
        if request.data.get("sweetness") is not None:
            review.sweetness = int(request.data["sweetness"])
        if request.data.get("tannin") is not None:
            review.tannin = int(request.data["tannin"])
        if "is_public" in request.data:
            review.is_public = request.data["is_public"]
        review.save()

        feels = request.data.get("feels")
        if feels is not None:
            from wine.models import Tag
            review.tags.clear()
            for name in feels:
                tag, _ = Tag.objects.get_or_create(name=name, defaults={"category": "fruity"})
                review.tags.add(tag)

        return Response(ReviewSerializer(review, context={"request": request}).data)

    def delete(self, request, pk):
        review = self._get_review(pk)
        if review.user != request.user:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReviewLikeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        review = get_object_or_404(WineReview, pk=pk)
        user = request.user
        if review.likes.filter(id=user.id).exists():
            review.likes.remove(user)
            return Response({"isLiked": False, "likeCount": review.likes.count()})
        else:
            review.likes.add(user)
            return Response({"isLiked": True, "likeCount": review.likes.count()})

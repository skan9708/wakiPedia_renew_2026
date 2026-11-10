from django.http import Http404
from rest_framework import serializers, status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from wine.models import Wine, WineReview, WineReviewImage
from wine.serializers import ReviewSerializer, ReviewCreateSerializer
from wine.review_images import protect_review_images, publish_review_images, validate_review_photos


class ReviewListView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        qs = WineReview.objects.filter(is_public=True).select_related(
            "wine", "user"
        ).prefetch_related("tags", "images", "likes")

        wine_id = request.query_params.get("wine_id")
        sort = request.query_params.get("sort", "latest")

        if wine_id:
            try:
                legacy_wine = Wine.objects.only("canonical_wine_id").get(pk=wine_id)
                wine_id = legacy_wine.canonical_wine_id or legacy_wine.id
            except (Wine.DoesNotExist, ValueError):
                pass
            qs = qs.filter(wine_id=wine_id)

        if sort == "popular":
            from django.db.models import Count
            qs = qs.annotate(like_cnt=Count("likes")).order_by("-like_cnt", "-created_at", "-id")
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

        validate_review_photos(images)
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

    def _get_review(self, request, pk):
        from django.shortcuts import get_object_or_404
        review = get_object_or_404(
            WineReview.objects.select_related("wine", "user").prefetch_related(
                "tags", "images", "likes"
            ),
            pk=pk,
        )
        if not review.is_public and review.user_id != request.user.pk:
            raise Http404
        return review

    def get(self, request, pk):
        review = self._get_review(request, pk)
        serializer = ReviewSerializer(review, context={"request": request})
        return Response(serializer.data)

    def patch(self, request, pk):
        review = self._get_review(request, pk)
        if review.user != request.user:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)

        if "is_public" in request.data:
            is_public = serializers.BooleanField().run_validation(request.data["is_public"])
        images = request.FILES.getlist("images")
        validate_review_photos(images)

        if request.data.get("text") is not None:
            review.text = request.data["text"]
        if request.data.get("rating") is not None:
            review.rating = round(float(request.data["rating"]) * 10)
        for field in ("body", "acidity", "sweetness", "tannin"):
            if field in request.data:
                raw_value = request.data[field]
                value = serializers.IntegerField(min_value=0, max_value=4, allow_null=True).run_validation(
                    None if raw_value == "" else raw_value
                )
                setattr(review, field, value)
        removed = request.data.getlist("remove_images") if hasattr(request.data, "getlist") else request.data.get("remove_images", [])
        if removed:
            for photo in review.images.filter(pk__in=removed):
                if photo.image and not WineReviewImage.objects.filter(image=photo.image.name).exclude(pk=photo.pk).exists():
                    photo.image.storage.delete(photo.image.name)
                photo.delete()
        if "is_public" in request.data:
            if not is_public and review.is_public:
                protect_review_images(review)
            review.is_public = is_public
        review.save()
        if "is_public" in request.data and is_public:
            publish_review_images(review)

        for image_file in images:
            if review.is_public:
                WineReviewImage.objects.create(review=review, image=image_file)
            else:
                WineReviewImage.objects.create(review=review, private_image=image_file)

        feels = request.data.getlist("feels") if hasattr(request.data, "getlist") and "feels" in request.data else request.data.get("feels")
        if feels is not None:
            from wine.models import Tag
            review.tags.clear()
            for name in feels:
                if not name:
                    continue
                tag, _ = Tag.objects.get_or_create(name=name, defaults={"category": "fruity"})
                review.tags.add(tag)

        review.refresh_from_db()
        return Response(ReviewSerializer(review, context={"request": request}).data)

    def delete(self, request, pk):
        review = self._get_review(request, pk)
        if review.user != request.user:
            return Response({"detail": "권한이 없습니다."}, status=status.HTTP_403_FORBIDDEN)
        review.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ReviewLikeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        review = get_object_or_404(WineReview, pk=pk, is_public=True)
        user = request.user
        if review.user_id == user.id:
            return Response(
                {"detail": "자신의 리뷰에는 '도움이 돼요'를 누를 수 없습니다."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if review.likes.filter(id=user.id).exists():
            review.likes.remove(user)
            return Response({"isLiked": False, "likeCount": review.likes.count()})
        else:
            review.likes.add(user)
            return Response({"isLiked": True, "likeCount": review.likes.count()})

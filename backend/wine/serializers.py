from django.db.models import Avg, Count
from rest_framework import serializers

from wine.models import Wine, WineReview, WineReviewImage, Tag, Country, GrapeVariety
from user.serializers import UserMiniSerializer


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ("id", "category", "name")


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ("id", "eng_name", "kor_name")


class GrapeVarietySerializer(serializers.ModelSerializer):
    class Meta:
        model = GrapeVariety
        fields = ("id", "eng_name", "kor_name")


class WineListSerializer(serializers.ModelSerializer):
    nameKr = serializers.CharField(source="kor_name")
    nameEng = serializers.CharField(source="eng_name")
    wineType = serializers.SerializerMethodField()
    regions = serializers.SerializerMethodField()
    breed = serializers.SerializerMethodField()
    imageUrl = serializers.SerializerMethodField()
    ratingAverage = serializers.SerializerMethodField()
    isFavorite = serializers.SerializerMethodField()

    class Meta:
        model = Wine
        fields = (
            "id", "nameKr", "nameEng", "wineType",
            "regions", "breed", "imageUrl", "ratingAverage", "isFavorite",
        )

    def get_wineType(self, obj):
        mapping = {"red": "Red", "white": "White", "sparkling": "Sparkling", "rose": "Rose"}
        return mapping.get(obj.type, obj.type)

    def get_regions(self, obj):
        return obj.country.kor_name if obj.country else None

    def get_breed(self, obj):
        varieties = obj.grape_varieties.all()
        if not varieties:
            return None
        return ", ".join(v.kor_name for v in varieties)

    def get_imageUrl(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

    def get_ratingAverage(self, obj):
        avg = obj.reviews.filter(is_public=True).aggregate(Avg("rating"))["rating__avg"]
        if avg is None:
            return None
        return round(avg / 10, 1)

    def get_isFavorite(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.favorite_users.filter(id=request.user.id).exists()
        return False


class ReviewImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = WineReviewImage
        fields = ("id", "url")

    def get_url(self, obj):
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.image.url)
        return obj.image.url


class ReviewSerializer(serializers.ModelSerializer):
    creator = UserMiniSerializer(source="user", read_only=True)
    wineId = serializers.PrimaryKeyRelatedField(source="wine", read_only=True)
    rating = serializers.SerializerMethodField()
    bodyRating = serializers.IntegerField(source="body", read_only=True)
    sweetRating = serializers.IntegerField(source="sweetness", read_only=True)
    taninRating = serializers.IntegerField(source="tannin", read_only=True)
    acidityRating = serializers.IntegerField(source="acidity", read_only=True)
    likeCount = serializers.SerializerMethodField()
    isLiked = serializers.SerializerMethodField()
    feels = serializers.SerializerMethodField()
    images = ReviewImageSerializer(many=True, read_only=True)
    createdAt = serializers.DateTimeField(source="created_at", read_only=True)
    wineName = serializers.SerializerMethodField()

    class Meta:
        model = WineReview
        fields = (
            "id", "wineId", "wineName", "creator",
            "rating", "bodyRating", "sweetRating", "taninRating", "acidityRating",
            "text", "likeCount", "isLiked", "feels", "images",
            "is_public", "createdAt",
        )

    def get_rating(self, obj):
        return round(obj.rating / 10, 1)

    def get_likeCount(self, obj):
        return obj.likes.count()

    def get_isLiked(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False

    def get_feels(self, obj):
        return list(obj.tags.values_list("name", flat=True))

    def get_wineName(self, obj):
        return obj.wine.kor_name


class ReviewCreateSerializer(serializers.ModelSerializer):
    rating = serializers.FloatField()
    feels = serializers.ListField(child=serializers.CharField(), required=False, default=list)

    class Meta:
        model = WineReview
        fields = (
            "wine", "rating", "text",
            "body", "acidity", "sweetness", "tannin",
            "is_public", "feels",
        )

    def validate_rating(self, value):
        raw = round(value * 10)
        if raw % 5 != 0:
            raise serializers.ValidationError("평점은 0.5 단위로만 입력 가능합니다.")
        if not (0 <= raw <= 50):
            raise serializers.ValidationError("평점은 0~5 사이여야 합니다.")
        return raw

    def validate_body(self, value):
        if not (0 <= value <= 4):
            raise serializers.ValidationError("바디는 0~4 사이여야 합니다.")
        return value

    def validate_acidity(self, value):
        if not (0 <= value <= 4):
            raise serializers.ValidationError("산도는 0~4 사이여야 합니다.")
        return value

    def validate_sweetness(self, value):
        if not (0 <= value <= 4):
            raise serializers.ValidationError("당도는 0~4 사이여야 합니다.")
        return value

    def validate_tannin(self, value):
        if not (0 <= value <= 4):
            raise serializers.ValidationError("탄닌은 0~4 사이여야 합니다.")
        return value

    def create(self, validated_data):
        feels = validated_data.pop("feels", [])
        validated_data.pop("images", [])
        images = self.context.get("images", [])
        user = self.context["request"].user

        review = WineReview.objects.create(user=user, **validated_data)

        for name in feels:
            tag, _ = Tag.objects.get_or_create(name=name, defaults={"category": "fruity"})
            review.tags.add(tag)

        for img in images:
            WineReviewImage.objects.create(review=review, image=img)

        return review


class WineDetailSerializer(WineListSerializer):
    ratingDistribution = serializers.SerializerMethodField()
    avgBody = serializers.SerializerMethodField()
    avgAcidity = serializers.SerializerMethodField()
    avgSweetness = serializers.SerializerMethodField()
    avgTannin = serializers.SerializerMethodField()
    keywords = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()

    class Meta(WineListSerializer.Meta):
        fields = WineListSerializer.Meta.fields + (
            "ratingDistribution", "avgBody", "avgAcidity", "avgSweetness", "avgTannin",
            "keywords", "reviews",
        )

    def _public_reviews(self, obj):
        return obj.reviews.filter(is_public=True)

    def get_ratingDistribution(self, obj):
        counts = [0] * 5
        for r in self._public_reviews(obj).values_list("rating", flat=True):
            star = round(r / 10)
            clamped = max(1, min(5, star))
            counts[clamped - 1] += 1
        return counts

    def get_avgBody(self, obj):
        avg = self._public_reviews(obj).aggregate(Avg("body"))["body__avg"]
        return round(avg, 1) if avg is not None else None

    def get_avgAcidity(self, obj):
        avg = self._public_reviews(obj).aggregate(Avg("acidity"))["acidity__avg"]
        return round(avg, 1) if avg is not None else None

    def get_avgSweetness(self, obj):
        avg = self._public_reviews(obj).aggregate(Avg("sweetness"))["sweetness__avg"]
        return round(avg, 1) if avg is not None else None

    def get_avgTannin(self, obj):
        avg = self._public_reviews(obj).aggregate(Avg("tannin"))["tannin__avg"]
        return round(avg, 1) if avg is not None else None

    def get_keywords(self, obj):
        tag_counts = (
            self._public_reviews(obj)
            .values("tags__name")
            .annotate(count=Count("tags"))
            .filter(tags__name__isnull=False)
            .order_by("-count")[:20]
        )
        return [{"text": item["tags__name"], "weight": item["count"]} for item in tag_counts]

    def get_reviews(self, obj):
        reviews = self._public_reviews(obj).select_related("user").prefetch_related(
            "tags", "images", "likes"
        )[:10]
        return ReviewSerializer(reviews, many=True, context=self.context).data

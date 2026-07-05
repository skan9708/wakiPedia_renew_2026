from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError

from wakipedia.models import BaseModel


def validate_multiple_of_five(value):
    if value % 5 != 0:
        raise ValidationError("평점은 5단위로만 입력 가능합니다.")


class Country(BaseModel):
    eng_name = models.CharField("영어 이름", max_length=255)
    kor_name = models.CharField("한국어 이름", max_length=255)

    class Meta:
        verbose_name = "국가"
        verbose_name_plural = verbose_name
        ordering = ["kor_name"]

    def __str__(self):
        return f"{self.kor_name} ({self.eng_name})"


class GrapeVariety(BaseModel):
    eng_name = models.CharField("영어 이름", max_length=255)
    kor_name = models.CharField("한국어 이름", max_length=255)

    class Meta:
        verbose_name = "품종"
        verbose_name_plural = verbose_name
        ordering = ["kor_name"]

    def __str__(self):
        return f"{self.kor_name} ({self.eng_name})"


class Tag(BaseModel):
    CATEGORIES = (
        ("fruity", "과일 (Fruity)"),
        ("floral", "꽃 (Floral)"),
        ("oaky", "오크 (Oaky)"),
        ("vegetal", "식물 (Vegetal)"),
    )
    category = models.CharField("카테고리", max_length=50, choices=CATEGORIES)
    name = models.CharField("이름", max_length=255, unique=True)

    class Meta:
        verbose_name = "태그"
        verbose_name_plural = verbose_name
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.get_category_display()} - {self.name}"


class Wine(BaseModel):
    TYPES = (
        ("red", "레드 (Red)"),
        ("white", "화이트 (White)"),
        ("sparkling", "스파클링 (Sparkling)"),
        ("rose", "로즈 (Rose)"),
    )
    eng_name = models.CharField("영어 이름", max_length=255)
    kor_name = models.CharField("한국어 이름", max_length=255)
    type = models.CharField("타입", max_length=50, choices=TYPES, blank=True, default="")
    country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True, blank=True, related_name="wines")
    grape_varieties = models.ManyToManyField(GrapeVariety, related_name="wines", blank=True)
    image = models.ImageField("와인 이미지", upload_to="wines/", null=True, blank=True)
    image_url = models.URLField("외부 이미지 URL", blank=True, default="")
    bubble_avg_rating = models.FloatField("버블 평균 평점", null=True, blank=True)
    registered_by = models.ForeignKey(
        "user.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="registered_wines"
    )

    class Meta:
        verbose_name = "와인"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.kor_name} ({self.eng_name})"


class WineReview(BaseModel):
    wine = models.ForeignKey(Wine, on_delete=models.CASCADE, related_name="reviews")
    user = models.ForeignKey("user.User", on_delete=models.CASCADE, related_name="wine_reviews")
    text = models.TextField("리뷰 내용")

    # 0~50 (5 단위) → 프론트엔드에서는 /10 하여 0.0~5.0으로 표시
    rating = models.IntegerField(
        "평점",
        validators=[MinValueValidator(0), MaxValueValidator(50), validate_multiple_of_five],
    )

    body = models.IntegerField("바디", validators=[MinValueValidator(0), MaxValueValidator(4)])
    acidity = models.IntegerField("산도", validators=[MinValueValidator(0), MaxValueValidator(4)])
    sweetness = models.IntegerField("당도", validators=[MinValueValidator(0), MaxValueValidator(4)])
    tannin = models.IntegerField("탄닌", validators=[MinValueValidator(0), MaxValueValidator(4)])

    is_public = models.BooleanField("공개 여부", default=True)

    tags = models.ManyToManyField(Tag, related_name="reviews", blank=True)
    likes = models.ManyToManyField("user.User", related_name="liked_reviews", blank=True)

    class Meta:
        verbose_name = "와인 리뷰"
        verbose_name_plural = verbose_name
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.wine.kor_name} - {self.user.nickname} - {self.rating / 10:.1f}점"


class WineReviewImage(BaseModel):
    review = models.ForeignKey(WineReview, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField("이미지", upload_to="review_images/")

    class Meta:
        verbose_name = "리뷰 이미지"
        verbose_name_plural = verbose_name
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.review} - 이미지"

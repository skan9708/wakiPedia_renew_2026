from django.contrib import admin
from wine.models import Wine, WineReview, WineReviewImage, Tag, Country, GrapeVariety


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ("kor_name", "eng_name")
    search_fields = ("kor_name", "eng_name")


@admin.register(GrapeVariety)
class GrapeVarietyAdmin(admin.ModelAdmin):
    list_display = ("kor_name", "eng_name")
    search_fields = ("kor_name", "eng_name")


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("category", "name")
    list_filter = ("category",)
    search_fields = ("name",)


class WineReviewInline(admin.TabularInline):
    model = WineReview
    extra = 0
    readonly_fields = ("user", "rating", "text", "created_at")


@admin.register(Wine)
class WineAdmin(admin.ModelAdmin):
    list_display = ("kor_name", "eng_name", "type", "country", "created_at")
    list_filter = ("type", "country")
    search_fields = ("kor_name", "eng_name")
    inlines = [WineReviewInline]


class ReviewImageInline(admin.TabularInline):
    model = WineReviewImage
    extra = 0


@admin.register(WineReview)
class WineReviewAdmin(admin.ModelAdmin):
    list_display = ("wine", "user", "rating_display", "is_public", "created_at")
    list_filter = ("is_public",)
    search_fields = ("wine__kor_name", "user__nickname")
    inlines = [ReviewImageInline]

    def rating_display(self, obj):
        return f"{obj.rating / 10:.1f}점"
    rating_display.short_description = "평점"

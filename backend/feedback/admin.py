from django.contrib import admin

from feedback.models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    list_display = ("id", "category", "status", "email", "created_at")
    list_filter = ("category", "status")
    search_fields = ("message", "email")

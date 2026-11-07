from django.db import models

from wakipedia.models import BaseModel


class Feedback(BaseModel):
    CATEGORY_CHOICES = [
        ("bug", "불편한 점"),
        ("idea", "원하는 기능"),
        ("other", "기타 의견"),
    ]
    STATUS_CHOICES = [("new", "새 피드백"), ("handled", "확인 완료")]

    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES)
    message = models.TextField()
    email = models.EmailField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="new")
    handled_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_category_display()} #{self.pk}"

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from feedback.models import Feedback
from feedback.serializers import FeedbackCreateSerializer


def feedback_data(item):
    return {
        "id": item.id,
        "category": item.category,
        "message": item.message,
        "email": item.email,
        "status": item.status,
        "createdAt": item.created_at.isoformat(),
        "handledAt": item.handled_at.isoformat() if item.handled_at else None,
    }


class FeedbackCreateView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "feedback"

    def post(self, request):
        serializer = FeedbackCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response({"id": item.id}, status=status.HTTP_201_CREATED)


class AdminFeedbackListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        qs = Feedback.objects.all()
        category = request.query_params.get("category")
        state = request.query_params.get("status")
        if category in dict(Feedback.CATEGORY_CHOICES):
            qs = qs.filter(category=category)
        if state in dict(Feedback.STATUS_CHOICES):
            qs = qs.filter(status=state)
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (TypeError, ValueError):
            page = 1
        limit = 20
        total = qs.count()
        start = (page - 1) * limit
        return Response({
            "results": [feedback_data(item) for item in qs[start:start + limit]],
            "total": total,
            "page": page,
            "hasNext": start + limit < total,
        })


class AdminFeedbackDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        item = get_object_or_404(Feedback, pk=pk)
        state = request.data.get("status")
        if state not in dict(Feedback.STATUS_CHOICES):
            return Response({"detail": "올바른 상태를 선택해 주세요."}, status=400)
        item.status = state
        item.handled_at = timezone.now() if state == "handled" else None
        item.save(update_fields=["status", "handled_at", "updated_at"])
        return Response(feedback_data(item))

    def delete(self, request, pk):
        get_object_or_404(Feedback, pk=pk).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

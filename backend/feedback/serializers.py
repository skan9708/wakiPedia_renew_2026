from rest_framework import serializers

from feedback.models import Feedback
from wine.models import Wine


class FeedbackCreateSerializer(serializers.ModelSerializer):
    message = serializers.CharField(min_length=10, max_length=2000, trim_whitespace=True)
    wineId = serializers.PrimaryKeyRelatedField(
        source="wine", queryset=Wine.objects.filter(catalog_visible=True), required=False,
    )

    class Meta:
        model = Feedback
        fields = ["category", "message", "wineId"]

    def validate(self, attrs):
        if "email" in self.initial_data or "replyConsent" in self.initial_data:
            raise serializers.ValidationError("피드백 양식에서는 이메일을 받지 않습니다.")
        if attrs.get("category") == "wine" and "wine" not in attrs:
            raise serializers.ValidationError({"wineId": "수정할 와인을 선택해 주세요."})
        if attrs.get("category") != "wine" and "wine" in attrs:
            raise serializers.ValidationError({"wineId": "와인 정보 수정 요청에만 와인을 연결할 수 있습니다."})
        return attrs

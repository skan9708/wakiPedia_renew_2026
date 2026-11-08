from rest_framework import serializers

from feedback.models import Feedback


class FeedbackCreateSerializer(serializers.ModelSerializer):
    message = serializers.CharField(min_length=10, max_length=2000, trim_whitespace=True)
    class Meta:
        model = Feedback
        fields = ["category", "message"]

    def validate(self, attrs):
        if "email" in self.initial_data or "replyConsent" in self.initial_data:
            raise serializers.ValidationError("피드백 양식에서는 이메일을 받지 않습니다.")
        return attrs

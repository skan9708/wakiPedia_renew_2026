from rest_framework import serializers

from feedback.models import Feedback


class FeedbackCreateSerializer(serializers.ModelSerializer):
    message = serializers.CharField(min_length=10, max_length=2000, trim_whitespace=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    replyConsent = serializers.BooleanField(write_only=True, required=False, default=False)

    class Meta:
        model = Feedback
        fields = ["category", "message", "email", "replyConsent"]

    def validate(self, attrs):
        if attrs.get("email") and not attrs.get("replyConsent"):
            raise serializers.ValidationError({"replyConsent": "답변용 이메일 수집에 동의해 주세요."})
        attrs.pop("replyConsent", None)
        return attrs

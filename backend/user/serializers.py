from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password

from user.models import User


class UserMiniSerializer(serializers.ModelSerializer):
    avatarUrl = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "nickname", "avatarUrl")

    def get_avatarUrl(self, obj):
        request = self.context.get("request")
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None


class UserSerializer(serializers.ModelSerializer):
    avatarUrl = serializers.SerializerMethodField()
    reviewCount = serializers.SerializerMethodField()
    likeCount = serializers.SerializerMethodField()
    likeRank = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "email", "nickname", "avatarUrl", "reviewCount", "likeCount", "likeRank", "created_at")

    def get_avatarUrl(self, obj):
        request = self.context.get("request")
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None

    def get_reviewCount(self, obj):
        return obj.wine_reviews.count()

    def get_likeCount(self, obj):
        from django.db.models import Count
        result = obj.wine_reviews.aggregate(total=Count("likes"))
        return result["total"] or 0

    def get_likeRank(self, obj):
        from django.db.models import Count
        from django.contrib.auth import get_user_model
        UserModel = get_user_model()
        my_likes = obj.wine_reviews.aggregate(total=Count("likes"))["total"] or 0
        if my_likes == 0:
            return None
        users_above = UserModel.objects.annotate(
            tl=Count("wine_reviews__likes")
        ).filter(tl__gt=my_likes).count()
        total = UserModel.objects.count()
        rank = users_above + 1
        top_pct = max(1, round((rank / max(total, 1)) * 100))
        return {"rank": rank, "total": total, "topPercent": top_pct}


class SignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    passwordConfirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("email", "nickname", "password", "passwordConfirm")

    def validate(self, data):
        if data["password"] != data["passwordConfirm"]:
            raise serializers.ValidationError({"passwordConfirm": "비밀번호가 일치하지 않습니다."})
        return data

    def create(self, validated_data):
        validated_data.pop("passwordConfirm")
        return User.objects.create_user(**validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("nickname", "avatar")
        extra_kwargs = {"avatar": {"required": False}}

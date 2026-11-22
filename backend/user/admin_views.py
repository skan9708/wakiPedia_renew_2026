from django.shortcuts import get_object_or_404
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_date
from rest_framework import serializers
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from user.models import User


class AdminPasswordChangeSerializer(serializers.Serializer):
    currentPassword = serializers.CharField(write_only=True)
    newPassword = serializers.CharField(write_only=True, min_length=8)


class AdminPasswordChangeView(APIView):
    permission_classes = [IsAdminUser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "admin_password_change"

    def post(self, request):
        serializer = AdminPasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        current_password = serializer.validated_data["currentPassword"]
        new_password = serializer.validated_data["newPassword"]
        user = request.user

        if not user.check_password(current_password):
            return Response({"detail": "현재 비밀번호가 올바르지 않습니다."}, status=400)
        if current_password == new_password:
            return Response({"detail": "새 비밀번호는 현재 비밀번호와 달라야 합니다."}, status=400)
        try:
            validate_password(new_password, user=user)
        except ValidationError as exc:
            return Response({"detail": exc.messages[0]}, status=400)

        user.set_password(new_password)
        user.auth_epoch += 1
        user.save(update_fields=["password", "auth_epoch"])
        return Response({"detail": "비밀번호가 변경되었습니다. 다시 로그인해주세요."})


def require_staff(request):
    if not request.user or not request.user.is_authenticated or not request.user.is_staff:
        return Response({"detail": "관리자 권한이 필요합니다."}, status=403)
    return None


class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = require_staff(request)
        if err:
            return err

        from django.db.models import Count
        qs = User.objects.annotate(review_count=Count("wine_reviews"))

        q = request.query_params.get("q", "")
        if q:
            qs = (qs.filter(email__icontains=q) | qs.filter(nickname__icontains=q)).distinct()
        account_status = request.query_params.get("status", "")
        if account_status in ("active", "inactive"):
            qs = qs.filter(is_active=account_status == "active")
        role = request.query_params.get("role", "")
        if role in ("staff", "member"):
            qs = qs.filter(is_staff=role == "staff")
        for param, lookup in (("date_from", "created_at__date__gte"), ("date_to", "created_at__date__lte")):
            date = parse_date(request.query_params.get(param, ""))
            if date:
                qs = qs.filter(**{lookup: date})
        ordering = {
            "newest": ("-created_at", "-id"),
            "oldest": ("created_at", "id"),
            "reviews_desc": ("-review_count", "-created_at", "-id"),
            "reviews_asc": ("review_count", "-created_at", "-id"),
        }
        qs = qs.order_by(*ordering.get(request.query_params.get("sort", "newest"), ordering["newest"]))

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            limit = min(100, max(1, int(request.query_params.get("limit", 20))))
        except ValueError:
            page, limit = 1, 20

        total = qs.count()
        start = (page - 1) * limit
        end = start + limit
        results = []
        for u in qs[start:end]:
            results.append({
                "id": u.id,
                "email": u.email,
                "nickname": u.nickname,
                "isActive": u.is_active,
                "isStaff": u.is_staff,
                "reviewCount": u.review_count,
                "createdAt": u.created_at.isoformat(),
            })
        return Response({"results": results, "total": total, "page": page, "hasNext": end < total})

    def post(self, request):
        err = require_staff(request)
        if err:
            return err

        email = (request.data.get("email") or "").strip()
        nickname = (request.data.get("nickname") or "").strip()
        password = request.data.get("password", "")

        if not email or not nickname or not password:
            return Response({"detail": "email, nickname, password는 필수입니다."}, status=400)
        if User.objects.filter(email=email).exists():
            return Response({"detail": "이미 존재하는 이메일입니다."}, status=400)

        # 관리자 권한은 관리자 패널에서 부여하지 않는다
        user = User.objects.create_user(email=email, password=password, nickname=nickname)
        return Response({"id": user.id, "email": user.email, "nickname": user.nickname}, status=201)


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        err = require_staff(request)
        if err:
            return err
        from django.db.models import Count
        u = get_object_or_404(User, pk=pk)
        reviews = u.wine_reviews.select_related("wine").annotate(like_count=Count("likes")).order_by("-created_at")
        return Response({
            "id": u.id,
            "email": u.email,
            "nickname": u.nickname,
            "avatarUrl": request.build_absolute_uri(u.avatar.url) if u.avatar else None,
            "kakaoId": u.kakao_id,
            "isActive": u.is_active,
            "isStaff": u.is_staff,
            "hasPassword": u.has_usable_password(),
            "createdAt": u.created_at.isoformat(),
            "updatedAt": u.updated_at.isoformat(),
            "lastLogin": u.last_login.isoformat() if u.last_login else None,
            "reviewCount": reviews.count(),
            "likesReceived": sum(r.like_count for r in reviews),
            "likesGiven": u.liked_reviews.count(),
            "favoriteWines": [
                {"id": w.id, "korName": w.kor_name} for w in u.favorite_wines.all().order_by("kor_name")
            ],
            "reviews": [
                {
                    "id": r.id,
                    "wineId": r.wine_id,
                    "wineKorName": r.wine.kor_name,
                    "rating": round(r.rating / 10, 1),
                    "text": r.text,
                    "isPublic": r.is_public,
                    "likeCount": r.like_count,
                    "createdAt": r.created_at.isoformat(),
                }
                for r in reviews[:100]
            ],
        })

    def put(self, request, pk):
        err = require_staff(request)
        if err:
            return err
        u = get_object_or_404(User, pk=pk)

        if "nickname" in request.data:
            u.nickname = request.data["nickname"]
        if "isActive" in request.data:
            u.is_active = bool(request.data["isActive"])
        if request.data.get("password"):
            u.set_password(request.data["password"])
        u.save()
        return Response({"id": u.id, "email": u.email, "nickname": u.nickname})

    def delete(self, request, pk):
        err = require_staff(request)
        if err:
            return err
        if str(pk) == str(request.user.id):
            return Response({"detail": "자신의 계정은 삭제할 수 없습니다."}, status=400)
        get_object_or_404(User, pk=pk).delete()
        return Response(status=204)

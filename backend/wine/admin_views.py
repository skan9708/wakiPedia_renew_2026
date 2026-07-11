from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from wine.models import Wine, WineReview, Tag, Country


def require_staff(request):
    if not request.user or not request.user.is_authenticated or not request.user.is_staff:
        return Response({"detail": "관리자 권한이 필요합니다."}, status=403)
    return None


# ────────────── Wine ──────────────

class AdminWineListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = require_staff(request)
        if err:
            return err

        qs = Wine.objects.select_related("country").order_by("-created_at")

        q = request.query_params.get("q", "")
        wine_type = request.query_params.get("type", "")
        if q:
            qs = (qs.filter(kor_name__icontains=q) | qs.filter(eng_name__icontains=q)).distinct()
        if wine_type:
            qs = qs.filter(type=wine_type)

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            limit = min(100, max(1, int(request.query_params.get("limit", 20))))
        except ValueError:
            page, limit = 1, 20

        total = qs.count()
        start = (page - 1) * limit
        end = start + limit
        results = []
        for w in qs[start:end]:
            img = ""
            if w.image_url:
                img = w.image_url
            elif w.image:
                img = request.build_absolute_uri(w.image.url)
            results.append({
                "id": w.id,
                "korName": w.kor_name,
                "engName": w.eng_name,
                "type": w.type,
                "country": w.country.kor_name if w.country else "",
                "imageUrl": img,
                "bubbleAvgRating": w.bubble_avg_rating,
                "createdAt": w.created_at.isoformat(),
            })
        return Response({"results": results, "total": total, "page": page, "hasNext": end < total})

    def post(self, request):
        err = require_staff(request)
        if err:
            return err

        kor_name = (request.data.get("korName") or "").strip()
        eng_name = (request.data.get("engName") or "").strip()
        wine_type = (request.data.get("type") or "").lower()
        country_name = (request.data.get("country") or "").strip()
        image_url = (request.data.get("imageUrl") or "").strip()
        raw_rating = request.data.get("bubbleAvgRating")

        if not kor_name or not eng_name:
            return Response({"detail": "korName, engName은 필수입니다."}, status=400)

        country = None
        if country_name:
            country, _ = Country.objects.get_or_create(
                kor_name=country_name, defaults={"eng_name": country_name}
            )

        bubble_avg = None
        if raw_rating not in (None, ""):
            try:
                bubble_avg = round(float(raw_rating), 1)
            except (TypeError, ValueError):
                pass

        wine = Wine.objects.create(
            kor_name=kor_name,
            eng_name=eng_name,
            type=wine_type,
            country=country,
            image_url=image_url,
            bubble_avg_rating=bubble_avg,
            registered_by=request.user,
        )
        return Response({
            "id": wine.id,
            "korName": wine.kor_name,
            "engName": wine.eng_name,
        }, status=201)


class AdminWineDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _wine(self, pk):
        return get_object_or_404(Wine.objects.select_related("country"), pk=pk)

    def get(self, request, pk):
        err = require_staff(request)
        if err:
            return err
        w = self._wine(pk)
        return Response({
            "id": w.id,
            "korName": w.kor_name,
            "engName": w.eng_name,
            "type": w.type,
            "country": w.country.kor_name if w.country else "",
            "imageUrl": w.image_url or "",
            "bubbleAvgRating": w.bubble_avg_rating,
            "createdAt": w.created_at.isoformat(),
        })

    def put(self, request, pk):
        err = require_staff(request)
        if err:
            return err
        w = self._wine(pk)

        if "korName" in request.data:
            w.kor_name = request.data["korName"]
        if "engName" in request.data:
            w.eng_name = request.data["engName"]
        if "type" in request.data:
            w.type = (request.data["type"] or "").lower()
        if "imageUrl" in request.data:
            w.image_url = request.data["imageUrl"] or ""
        if "bubbleAvgRating" in request.data:
            v = request.data["bubbleAvgRating"]
            w.bubble_avg_rating = round(float(v), 1) if v not in (None, "") else None
        if "country" in request.data:
            country_name = (request.data["country"] or "").strip()
            if country_name:
                c, _ = Country.objects.get_or_create(
                    kor_name=country_name, defaults={"eng_name": country_name}
                )
                w.country = c
            else:
                w.country = None
        w.save()
        return Response({"id": w.id, "korName": w.kor_name, "engName": w.eng_name})

    def delete(self, request, pk):
        err = require_staff(request)
        if err:
            return err
        self._wine(pk).delete()
        return Response(status=204)


# ────────────── Review ──────────────

class AdminReviewListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = require_staff(request)
        if err:
            return err

        qs = WineReview.objects.select_related("wine", "user").order_by("-created_at")

        q = request.query_params.get("q", "")
        wine_id = request.query_params.get("wine_id", "")
        if q:
            qs = (
                qs.filter(wine__kor_name__icontains=q)
                | qs.filter(user__nickname__icontains=q)
                | qs.filter(text__icontains=q)
            ).distinct()
        if wine_id:
            qs = qs.filter(wine_id=wine_id)

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            limit = min(100, max(1, int(request.query_params.get("limit", 20))))
        except ValueError:
            page, limit = 1, 20

        total = qs.count()
        start = (page - 1) * limit
        end = start + limit
        results = []
        for r in qs[start:end]:
            results.append({
                "id": r.id,
                "wineId": r.wine_id,
                "wineKorName": r.wine.kor_name,
                "userId": r.user_id,
                "userNickname": r.user.nickname,
                "rating": round(r.rating / 10, 1),
                "text": r.text,
                "isPublic": r.is_public,
                "likeCount": r.likes.count(),
                "createdAt": r.created_at.isoformat(),
            })
        return Response({"results": results, "total": total, "page": page, "hasNext": end < total})

    def post(self, request):
        err = require_staff(request)
        if err:
            return err

        wine_id = request.data.get("wineId")
        user_id = request.data.get("userId")
        text = (request.data.get("text") or "").strip()
        raw_rating = request.data.get("rating", 3.0)
        is_public = request.data.get("isPublic", True)

        if not wine_id or not text:
            return Response({"detail": "wineId, text는 필수입니다."}, status=400)

        from user.models import User
        wine = get_object_or_404(Wine, pk=wine_id)
        user = get_object_or_404(User, pk=user_id) if user_id else request.user

        rating_db = round(float(raw_rating) * 10 / 5) * 5
        rating_db = max(0, min(50, rating_db))

        review = WineReview.objects.create(
            wine=wine,
            user=user,
            text=text,
            rating=rating_db,
            body=2,
            acidity=2,
            sweetness=2,
            tannin=2,
            is_public=bool(is_public),
        )
        return Response({"id": review.id}, status=201)


class AdminReviewDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _review(self, pk):
        return get_object_or_404(
            WineReview.objects.select_related("wine", "user"), pk=pk
        )

    def get(self, request, pk):
        err = require_staff(request)
        if err:
            return err
        r = self._review(pk)
        return Response({
            "id": r.id,
            "wineId": r.wine_id,
            "wineKorName": r.wine.kor_name,
            "userId": r.user_id,
            "userNickname": r.user.nickname,
            "rating": round(r.rating / 10, 1),
            "text": r.text,
            "body": r.body,
            "acidity": r.acidity,
            "sweetness": r.sweetness,
            "tannin": r.tannin,
            "isPublic": r.is_public,
            "createdAt": r.created_at.isoformat(),
        })

    def put(self, request, pk):
        err = require_staff(request)
        if err:
            return err
        r = self._review(pk)

        if "text" in request.data:
            r.text = request.data["text"]
        if "rating" in request.data:
            rating_db = round(float(request.data["rating"]) * 10 / 5) * 5
            r.rating = max(0, min(50, rating_db))
        if "isPublic" in request.data:
            r.is_public = bool(request.data["isPublic"])
        if "body" in request.data:
            r.body = int(request.data["body"])
        if "acidity" in request.data:
            r.acidity = int(request.data["acidity"])
        if "sweetness" in request.data:
            r.sweetness = int(request.data["sweetness"])
        if "tannin" in request.data:
            r.tannin = int(request.data["tannin"])
        r.save()
        return Response({"id": r.id})

    def delete(self, request, pk):
        err = require_staff(request)
        if err:
            return err
        self._review(pk).delete()
        return Response(status=204)


# ────────────── Tag ──────────────

class AdminTagListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = require_staff(request)
        if err:
            return err

        qs = Tag.objects.all().order_by("category", "name")

        category = request.query_params.get("category", "")
        q = request.query_params.get("q", "")
        if category:
            qs = qs.filter(category=category)
        if q:
            qs = qs.filter(name__icontains=q)

        try:
            page = max(1, int(request.query_params.get("page", 1)))
            limit = min(200, max(1, int(request.query_params.get("limit", 100))))
        except ValueError:
            page, limit = 1, 100

        total = qs.count()
        start = (page - 1) * limit
        end = start + limit
        results = [{"id": t.id, "name": t.name, "category": t.category} for t in qs[start:end]]
        return Response({"results": results, "total": total, "page": page, "hasNext": end < total})

    def post(self, request):
        err = require_staff(request)
        if err:
            return err

        name = (request.data.get("name") or "").strip()
        category = request.data.get("category", "fruity")

        if not name:
            return Response({"detail": "name은 필수입니다."}, status=400)
        if Tag.objects.filter(name=name).exists():
            return Response({"detail": "이미 존재하는 태그입니다."}, status=400)

        tag = Tag.objects.create(name=name, category=category)
        return Response({"id": tag.id, "name": tag.name, "category": tag.category}, status=201)


class AdminTagDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        err = require_staff(request)
        if err:
            return err
        tag = get_object_or_404(Tag, pk=pk)
        if "name" in request.data:
            tag.name = request.data["name"]
        if "category" in request.data:
            tag.category = request.data["category"]
        tag.save()
        return Response({"id": tag.id, "name": tag.name, "category": tag.category})

    def delete(self, request, pk):
        err = require_staff(request)
        if err:
            return err
        get_object_or_404(Tag, pk=pk).delete()
        return Response(status=204)

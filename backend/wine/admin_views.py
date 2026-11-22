from django.shortcuts import get_object_or_404
from django.db.models import Count, OuterRef, Q, Subquery
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import serializers, status

from user.models import User
from wine.models import Wine, WineReview, Tag, Country, GrapeVariety, WineDuplicateCandidate
from wine.image_utils import public_review_image_names, wine_display_image_url
from wine.review_images import protect_review_images, publish_review_images, review_image_url
from wine.duplicate_review import DuplicateMergeError, decide_duplicate
from wine.suggestions import queue_duplicate_candidates, suggestion_score
from wine.naming import normalize_wine_names


def require_staff(request):
    if not request.user or not request.user.is_authenticated or not request.user.is_staff:
        return Response({"detail": "관리자 권한이 필요합니다."}, status=403)
    return None


class AdminDuplicateListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = require_staff(request)
        if err:
            return err
        qs = WineDuplicateCandidate.objects.filter(status="pending").order_by("-created_at")
        total = qs.count()
        if request.query_params.get("countOnly") == "1":
            return Response({"total": total})
        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except (ValueError, TypeError):
            page = 1
        items = list(qs[(page - 1) * 100:page * 100])
        wine_ids = {wine_id for item in items for wine_id in (item.source_id, item.target_id)}
        wines = Wine.objects.filter(pk__in=wine_ids).select_related("country").prefetch_related(
            "grape_varieties"
        ).annotate(review_cover_image=Subquery(public_review_image_names(OuterRef("pk"))[:1])).in_bulk()
        review_counts = dict(WineReview.objects.filter(wine_id__in=wine_ids).values("wine_id").annotate(n=Count("id")).values_list("wine_id", "n"))
        favorite_counts = dict(
            User.favorite_wines.through.objects.filter(wine_id__in=wine_ids)
            .values("wine_id").annotate(n=Count("id")).values_list("wine_id", "n")
        )
        def describe(wine):
            return {
                "id": wine.pk,
                "nameKr": wine.kor_name,
                "nameEng": wine.eng_name,
                "wineType": wine.type,
                "country": wine.country.kor_name if wine.country else "",
                "grapes": [grape.kor_name for grape in wine.grape_varieties.all()],
                "imageUrl": wine_display_image_url(wine, request) or "",
                "reviewCount": review_counts.get(wine.pk, 0),
                "favoriteCount": favorite_counts.get(wine.pk, 0),
                "createdAt": wine.created_at.isoformat(),
            }

        return Response({
            "results": [{
                "id": item.pk,
                "score": round(item.score, 3),
                "nameScore": round(suggestion_score(
                    wines[item.source_id].eng_name, wines[item.source_id].kor_name,
                    wines[item.target_id].eng_name, wines[item.target_id].kor_name,
                    wines[item.target_id].search_aliases,
                    wines[item.source_id].type, wines[item.target_id].type,
                    wines[item.source_id].country.kor_name if wines[item.source_id].country else "",
                    wines[item.target_id].country.kor_name if wines[item.target_id].country else "",
                ), 3),
                "imageScore": round(item.image_score, 3) if item.image_score is not None else None,
                "createdAt": item.created_at.isoformat(),
                "source": describe(wines[item.source_id]),
                "target": describe(wines[item.target_id]),
            } for item in items],
            "total": total,
        })


class AdminDuplicateDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        err = require_staff(request)
        if err:
            return err
        approved = request.data.get("approved")
        if type(approved) is not bool:
            return Response({"detail": "통합 또는 별개 여부를 선택해 주세요."}, status=400)
        try:
            confirm_target_id = int(request.data.get("confirmTargetId")) if approved else None
        except (ValueError, TypeError):
            return Response({"detail": "기존 와인 번호를 확인해 주세요."}, status=400)
        try:
            candidate = decide_duplicate(
                pk, approved=approved, reviewer=request.user, confirm_target_id=confirm_target_id,
            )
        except WineDuplicateCandidate.DoesNotExist:
            return Response({"detail": "검토 후보가 없습니다."}, status=404)
        except DuplicateMergeError as exc:
            return Response({"detail": str(exc)}, status=409)
        return Response({"result": candidate.status})


class AdminCatalogTermListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = require_staff(request)
        if err:
            return err
        results = []
        for kind, model in (("country", Country), ("grape", GrapeVariety)):
            pending = model.objects.filter(is_approved=False).annotate(
                wine_count=Count("wines", filter=Q(wines__catalog_visible=True), distinct=True)
            )
            results.extend({
                "kind": kind,
                "id": term.id,
                "name": term.kor_name,
                "wineCount": term.wine_count,
                "createdAt": term.created_at.isoformat(),
            } for term in pending)
        results.sort(key=lambda item: item["createdAt"], reverse=True)
        return Response({"results": results, "total": len(results)})


class AdminCatalogTermDecisionView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, kind, pk):
        err = require_staff(request)
        if err:
            return err
        model = {"country": Country, "grape": GrapeVariety}.get(kind)
        if model is None:
            return Response({"detail": "알 수 없는 항목입니다."}, status=404)
        decision = request.data.get("approved")
        if type(decision) is not bool:
            return Response({"detail": "승인 여부를 선택해 주세요."}, status=400)
        term = get_object_or_404(model, pk=pk, is_approved=False)
        if decision:
            term.is_approved = True
            term.save(update_fields=["is_approved", "updated_at"])
        else:
            term.delete()
        return Response({"result": "approved" if decision else "rejected"})


# ────────────── Wine ──────────────

class AdminWineListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        err = require_staff(request)
        if err:
            return err

        qs = Wine.objects.filter(catalog_visible=True).select_related("country").order_by("-created_at")

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
        page_wines = qs[start:end].annotate(
            review_cover_image=Subquery(public_review_image_names(OuterRef("pk"))[:1])
        )
        results = []
        for w in page_wines:
            img = wine_display_image_url(w, request) or ""
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

        kor_name, eng_name = normalize_wine_names(
            request.data.get("korName"), request.data.get("engName"),
        )
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
        queue_duplicate_candidates(wine)
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
        from django.db.models import Avg, Count
        w = self._wine(pk)
        reviews = w.reviews.select_related("user").annotate(like_count=Count("likes")).order_by("-created_at")
        public = w.reviews.filter(is_public=True)
        avg = public.aggregate(
            rating=Avg("rating"), body=Avg("body"), acidity=Avg("acidity"),
            sweetness=Avg("sweetness"), tannin=Avg("tannin"),
        )
        round1 = lambda v, d=1: round(v / d, 1) if v is not None else None
        uploaded = request.build_absolute_uri(w.image.url) if w.image else None
        return Response({
            "id": w.id,
            "korName": w.kor_name,
            "engName": w.eng_name,
            "type": w.type,
            "country": w.country.kor_name if w.country else "",
            "countryEng": w.country.eng_name if w.country else "",
            "imageUrl": w.image_url or "",
            "uploadedImageUrl": uploaded,
            "displayImageUrl": wine_display_image_url(w, request),
            "grapeVarieties": [g.kor_name for g in w.grape_varieties.all()],
            "bubbleAvgRating": w.bubble_avg_rating,
            "reviewAvgRating": round1(avg["rating"], 10),
            "tasteAvg": {k: round1(avg[k]) for k in ("body", "sweetness", "acidity", "tannin")},
            "reviewCount": reviews.count(),
            "publicReviewCount": public.count(),
            "favoriteCount": w.favorite_users.count(),
            "registeredBy": (
                {"id": w.registered_by_id, "nickname": w.registered_by.nickname} if w.registered_by else None
            ),
            "createdAt": w.created_at.isoformat(),
            "updatedAt": w.updated_at.isoformat(),
            "reviews": [
                {
                    "id": r.id,
                    "userId": r.user_id,
                    "userNickname": r.user.nickname,
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
            "wineEngName": r.wine.eng_name,
            "userId": r.user_id,
            "userNickname": r.user.nickname,
            "userEmail": r.user.email,
            "rating": round(r.rating / 10, 1),
            "text": r.text,
            "body": r.body,
            "acidity": r.acidity,
            "sweetness": r.sweetness,
            "tannin": r.tannin,
            "isPublic": r.is_public,
            "feels": list(r.tags.values_list("name", flat=True)),
            "images": [
                {"id": img.id, "url": review_image_url(img, request), "createdAt": img.created_at.isoformat()}
                for img in r.images.all()
            ],
            "likeCount": r.likes.count(),
            "likedBy": [{"id": u.id, "nickname": u.nickname} for u in r.likes.all()],
            "createdAt": r.created_at.isoformat(),
            "updatedAt": r.updated_at.isoformat(),
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
            is_public = serializers.BooleanField().run_validation(request.data["isPublic"])
        if "body" in request.data:
            r.body = int(request.data["body"])
        if "acidity" in request.data:
            r.acidity = int(request.data["acidity"])
        if "sweetness" in request.data:
            r.sweetness = int(request.data["sweetness"])
        if "tannin" in request.data:
            r.tannin = int(request.data["tannin"])
        if "isPublic" in request.data:
            if not is_public and r.is_public:
                protect_review_images(r)
            r.is_public = is_public
        r.save()
        if "isPublic" in request.data and r.is_public:
            publish_review_images(r)
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

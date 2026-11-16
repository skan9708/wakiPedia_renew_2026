"""Apply one administrator-reviewed catalog merge without losing user activity."""

from django.db import transaction
from django.utils import timezone

from user.models import User
from wine.models import Wine, WineDuplicateCandidate, WineReview, WineReviewImage


class DuplicateMergeError(ValueError):
    pass


@transaction.atomic
def decide_duplicate(candidate_id, *, approved, reviewer, confirm_target_id=None):
    candidate = WineDuplicateCandidate.objects.select_for_update().get(pk=candidate_id)
    if candidate.status != "pending":
        raise DuplicateMergeError("이미 검토한 후보입니다.")
    if not approved:
        candidate.status = "rejected"
        candidate.reviewed_by = reviewer
        candidate.reviewed_at = timezone.now()
        candidate.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
        return candidate

    if confirm_target_id != candidate.target_id:
        raise DuplicateMergeError("통합할 기존 와인 번호를 다시 확인해 주세요.")
    locked = Wine.objects.select_for_update().select_related("country").in_bulk(
        [candidate.source_id, candidate.target_id]
    )
    source = locked.get(candidate.source_id)
    target = locked.get(candidate.target_id)
    if not source or not target or source.pk == target.pk:
        raise DuplicateMergeError("통합할 와인을 찾을 수 없습니다.")
    if not source.catalog_visible or source.canonical_wine_id or not target.catalog_visible or target.canonical_wine_id:
        raise DuplicateMergeError("이미 통합됐거나 비공개된 와인이 포함돼 있습니다.")
    if source.type and target.type and source.type != target.type:
        raise DuplicateMergeError("와인 종류가 다릅니다. 먼저 와인 정보를 확인해 주세요.")
    if source.country_id and target.country_id and source.country_id != target.country_id:
        raise DuplicateMergeError("원산지가 다릅니다. 먼저 와인 정보를 확인해 주세요.")
    source_grapes = set(source.grape_varieties.values_list("id", flat=True))
    target_grapes = set(target.grape_varieties.values_list("id", flat=True))
    if source_grapes and target_grapes and not source_grapes.intersection(target_grapes):
        raise DuplicateMergeError("품종이 다릅니다. 먼저 와인 정보를 확인해 주세요.")

    descendants = list(Wine.objects.select_for_update().filter(canonical_wine_id=source.pk))
    if any(wine.catalog_visible for wine in descendants):
        raise DuplicateMergeError("통합 이력에 오류가 있어 중단했습니다.")
    move_ids = [source.pk, *(wine.pk for wine in descendants)]
    review_count = WineReview.objects.count()
    image_count = WineReviewImage.objects.count()
    WineReview.objects.filter(wine_id__in=move_ids).update(wine_id=target.pk)

    favorites = User.favorite_wines.through
    user_ids = favorites.objects.filter(wine_id__in=move_ids).values_list("user_id", flat=True).distinct()
    favorites.objects.bulk_create(
        [favorites(user_id=user_id, wine_id=target.pk) for user_id in user_ids],
        ignore_conflicts=True,
    )
    favorites.objects.filter(wine_id__in=move_ids).delete()

    aliases = [value.strip() for value in target.search_aliases.split(",") if value.strip()]
    known = {value.casefold() for value in aliases}
    for value in (source.eng_name, source.kor_name, *source.search_aliases.split(",")):
        value = value.strip()
        if value and value.casefold() not in known:
            aliases.append(value)
            known.add(value.casefold())
    target.search_aliases = ", ".join(aliases)
    if not target.image and not target.image_url:
        target.image = source.image
        target.image_url = source.image_url
    target.save(update_fields=["search_aliases", "image", "image_url", "updated_at"])
    if not target.grape_varieties.exists() and source_grapes:
        target.grape_varieties.set(source_grapes)
    Wine.objects.filter(pk__in=[wine.pk for wine in descendants]).update(canonical_wine=target)
    source.catalog_visible = False
    source.canonical_wine = target
    source.save(update_fields=["catalog_visible", "canonical_wine", "updated_at"])

    if (WineReview.objects.filter(wine_id__in=move_ids).exists()
            or favorites.objects.filter(wine_id__in=move_ids).exists()
            or WineReview.objects.count() != review_count
            or WineReviewImage.objects.count() != image_count):
        raise DuplicateMergeError("기록 이전을 확인하지 못해 통합을 취소했습니다.")

    candidate.status = "merged"
    candidate.reviewed_by = reviewer
    candidate.reviewed_at = timezone.now()
    candidate.save(update_fields=["status", "reviewed_by", "reviewed_at", "updated_at"])
    WineDuplicateCandidate.objects.filter(status="pending").exclude(pk=candidate.pk).filter(
        source_id__in=move_ids
    ).update(status="closed", reviewed_by=reviewer, reviewed_at=timezone.now())
    WineDuplicateCandidate.objects.filter(status="pending", target_id__in=move_ids).update(
        status="closed", reviewed_by=reviewer, reviewed_at=timezone.now()
    )
    return candidate

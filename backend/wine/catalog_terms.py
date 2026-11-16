"""Reuse catalog metadata and hold user-submitted terms for staff review."""

from django.db.models import Q

from wine.naming import normalize_grape_name


def resolve_catalog_term(model, name, *, approved):
    cleaned = " ".join((name or "").split())
    if not cleaned:
        return None
    if model.__name__ == "GrapeVariety":
        cleaned = normalize_grape_name(cleaned)
    existing = (
        model.objects.filter(Q(kor_name__iexact=cleaned) | Q(eng_name__iexact=cleaned))
        .order_by("-is_approved", "id")
        .first()
    )
    if existing:
        return existing
    return model.objects.create(
        kor_name=cleaned, eng_name=cleaned, is_approved=approved,
    )

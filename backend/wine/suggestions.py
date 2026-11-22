"""Find plausible catalog matches while someone registers a wine."""

import re
import unicodedata
from difflib import SequenceMatcher

from django.db.models import F, Q, Value
from django.db.models.functions import Length, Replace

from wine.image_similarity import image_similarity, save_wine_fingerprint
from wine.models import Wine, WineDuplicateCandidate


MIN_SUGGESTION_SCORE = 0.68
COMMON_WORDS = {
    "chateau", "chateaux", "domaine", "domain", "winery", "wine",
    "red", "white", "reserve", "vin", "샤또", "샤토", "도멘", "와인",
}


def normalized_name(value):
    value = unicodedata.normalize("NFKC", value or "").replace("샤또", "샤토")
    value = unicodedata.normalize("NFKD", value)
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = unicodedata.normalize("NFKC", value).casefold()
    value = value.replace("œ", "oe").replace("æ", "ae")
    return "".join(char for char in value if char.isalnum())


def has_searchable_name(name_eng, name_kr):
    return len(normalized_name(name_eng)) >= 4 or len(normalized_name(name_kr)) >= 2


def search_hints(name_eng, name_kr):
    """Use full names and distinctive fragments to bound database work."""
    hints = []
    for name in (name_eng, name_kr):
        raw = unicodedata.normalize("NFKC", name or "").strip()
        compact = normalized_name(raw)
        if len(compact) < 3:
            continue
        per_name = []
        if len(raw) >= 4:
            per_name.append(raw)
        words = re.findall(r"[^\W_]+", raw.casefold())
        words = [word for word in words if len(word) >= 3]
        specific = [word for word in words if normalized_name(word) not in COMMON_WORDS]
        per_name.extend(sorted(specific or words, key=len, reverse=True)[:2])
        if len(words) <= 1 and len(compact) >= 5:
            # A Korean name may be entered without spaces while the catalog has them.
            per_name.extend((compact[-3:], compact[:3]))
        for hint in per_name:
            if hint and hint.casefold() not in {item.casefold() for item in hints}:
                hints.append(hint)
    return hints[:8]


def _similarity(query, candidate):
    if not query or not candidate:
        return 0.0
    if query == candidate:
        return 1.0
    score = SequenceMatcher(None, query, candidate).ratio()
    if 2 <= len(query) <= 3 and any("가" <= char <= "힣" for char in query) and query in candidate:
        score = max(score, 0.68 + 0.17 * len(query) / len(candidate))
    if len(query) >= 4 and query in candidate:
        score = max(score, 0.68 + 0.22 * len(query) / len(candidate))
    if len(candidate) >= 4 and candidate in query:
        score = max(score, 0.66 + 0.22 * len(candidate) / len(query))
    return score


def suggestion_score(name_eng, name_kr, candidate_eng, candidate_kr, aliases="", wine_type="", candidate_type="", country="", candidate_country=""):
    english = normalized_name(name_eng)
    korean = normalized_name(name_kr)
    choices = [normalized_name(candidate_eng), normalized_name(candidate_kr)]
    choices.extend(normalized_name(alias) for alias in (aliases or "").split(","))
    english_score = max((_similarity(english, choice) for choice in choices), default=0)
    korean_score = max((_similarity(korean, choice) for choice in choices), default=0)
    score = max(english_score, korean_score)
    if score < MIN_SUGGESTION_SCORE:
        return 0.0
    if english_score >= 0.75 and korean_score >= 0.75:
        score += 0.05
    if wine_type and wine_type.casefold() == (candidate_type or "").casefold():
        score += 0.015
    if country and normalized_name(country) == normalized_name(candidate_country):
        score += 0.01
    return score


def ranked_wine_ids(name_eng, name_kr, *, wine_type="", country="", exclude_id=None, minimum=MIN_SUGGESTION_SCORE):
    """Return up to five visible catalog matches, strongest name match first."""
    if not has_searchable_name(name_eng, name_kr):
        return []
    candidates = {}
    for hint in search_hints(name_eng, name_kr):
        matches = Wine.objects.filter(catalog_visible=True)
        if exclude_id is not None:
            matches = matches.exclude(pk=exclude_id)
        matches = (
            matches.filter(
                Q(eng_name__icontains=hint)
                | Q(kor_name__icontains=hint)
                | Q(search_aliases__icontains=hint)
            )
            .values_list("id", "eng_name", "kor_name", "search_aliases", "type", "country__kor_name")
            .order_by("-id")[:150]
        )
        for row in matches:
            candidates[row[0]] = row
    compact_korean = normalized_name(name_kr)
    if len(compact_korean) >= 2 and any("가" <= char <= "힣" for char in compact_korean):
        # Find Korean names across spaces, hyphens and the common 샤또/샤토 spelling.
        compact_field = Replace(Replace(Replace(
            F("kor_name"), Value(" "), Value(""),
        ), Value("-"), Value("")), Value("샤또"), Value("샤토"))
        matches = Wine.objects.filter(catalog_visible=True).annotate(
            compact_korean=compact_field,
        ).filter(compact_korean__icontains=compact_korean)
        if exclude_id is not None:
            matches = matches.exclude(pk=exclude_id)
        for row in (
            matches.order_by(Length("kor_name"), "-id")
            .values_list("id", "eng_name", "kor_name", "search_aliases", "type", "country__kor_name")[:300]
        ):
            candidates[row[0]] = row
    ranked = []
    for wine_id, candidate_eng, candidate_kr, aliases, candidate_type, candidate_country in candidates.values():
        score = suggestion_score(
            name_eng, name_kr, candidate_eng, candidate_kr, aliases,
            wine_type, candidate_type, country, candidate_country,
        )
        if score >= minimum:
            ranked.append((score, wine_id))
    ranked.sort(reverse=True)
    return ranked[:5]


def queue_duplicate_candidates(wine):
    """Queue plausible matches for a human; registration never merges automatically."""
    country = wine.country.kor_name if wine.country_id else ""
    name_matches = {target_id: score for score, target_id in ranked_wine_ids(
        wine.eng_name, wine.kor_name, wine_type=wine.type,
        country=country, exclude_id=wine.pk, minimum=0.85,
    )}
    # A newly uploaded photo is available after Wine.objects.create() saves it.
    if wine.image and not wine.image_hash:
        save_wine_fingerprint(wine)
    image_matches = {}
    if wine.image_hash and wine.image_crop_hash and wine.image_color:
        candidates = Wine.objects.filter(catalog_visible=True).exclude(pk=wine.pk).exclude(image_hash="")
        if wine.type:
            candidates = candidates.filter(type=wine.type)
        for target in candidates.only("id", "image_hash", "image_crop_hash", "image_color", "country_id").iterator(chunk_size=500):
            if wine.country_id and target.country_id and wine.country_id != target.country_id:
                continue
            score = image_similarity(wine, target)
            if score is not None:
                image_matches[target.pk] = score
        image_matches = dict(sorted(image_matches.items(), key=lambda item: item[1], reverse=True)[:5])
    for target_id in set(name_matches) | set(image_matches):
        name_score = name_matches.get(target_id, 0)
        image_score = image_matches.get(target_id)
        score = max(name_score, image_score or 0)
        candidate, created = WineDuplicateCandidate.objects.get_or_create(
            source=wine, target_id=target_id,
            defaults={"score": score, "image_score": image_score},
        )
        if not created and candidate.status == "pending" and (
            score > candidate.score or (image_score is not None and (candidate.image_score is None or image_score > candidate.image_score))
        ):
            candidate.score = max(score, candidate.score)
            candidate.image_score = max(image_score or 0, candidate.image_score or 0) or None
            candidate.save(update_fields=["score", "image_score", "updated_at"])

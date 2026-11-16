"""Find plausible catalog matches while someone registers a wine."""

import re
import unicodedata
from difflib import SequenceMatcher


MIN_SUGGESTION_SCORE = 0.68
COMMON_WORDS = {
    "chateau", "chateaux", "domaine", "domain", "winery", "wine",
    "red", "white", "reserve", "vin", "샤또", "샤토", "도멘", "와인",
}


def normalized_name(value):
    value = unicodedata.normalize("NFKD", unicodedata.normalize("NFKC", value or ""))
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = unicodedata.normalize("NFKC", value).casefold()
    value = value.replace("œ", "oe").replace("æ", "ae")
    return "".join(char for char in value if char.isalnum())


def has_searchable_name(name_eng, name_kr):
    return len(normalized_name(name_eng)) >= 4 or len(normalized_name(name_kr)) >= 3


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

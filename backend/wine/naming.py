"""Conservative naming rules for newly submitted wines.

Only known grape spelling variants are rewritten. Product lines, regions, and
non-year words such as "Vintage" remain part of the wine's identity.
"""

import re
import unicodedata


GRAPE_SPELLINGS = {
    "카베르네 쇼비뇽": "카베르네 소비뇽",
    "카브레네 소비뇽": "카베르네 소비뇽",
    "카브레네 쇼비뇽": "카베르네 소비뇽",
    "까베르네 소비뇽": "카베르네 소비뇽",
    "까베르네 쇼비뇽": "카베르네 소비뇽",
    "카베르네소비뇽": "카베르네 소비뇽",
    "까베르네소비뇽": "카베르네 소비뇽",
}

_YEAR = re.compile(r"(?<![\w])(?:19|20)\d{2}(?:년)?(?![\w])")
_SPACES = re.compile(r"\s+")


def normalize_grape_name(name):
    cleaned = _SPACES.sub(" ", unicodedata.normalize("NFKC", str(name or ""))).strip()
    return GRAPE_SPELLINGS.get(cleaned, cleaned)


def normalize_wine_name(name, *, korean=False):
    cleaned = _SPACES.sub(" ", unicodedata.normalize("NFKC", str(name or ""))).strip()
    # Remove only a standalone four-digit vintage. Keep product-line names and
    # numbers such as "35 South" or "Bin 389" intact.
    cleaned = _YEAR.sub("", cleaned)
    cleaned = re.sub(r"\(\s*\)|\[\s*\]", "", cleaned)
    cleaned = _SPACES.sub(" ", cleaned).strip(" ,/-·")
    if korean:
        for variant, canonical in GRAPE_SPELLINGS.items():
            cleaned = re.sub(rf"(?<![가-힣]){re.escape(variant)}(?![가-힣])", canonical, cleaned)
    return cleaned


def normalize_wine_names(name_kr, name_eng):
    return normalize_wine_name(name_kr, korean=True), normalize_wine_name(name_eng)

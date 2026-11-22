"""Conservative perceptual hashes for catalog photos.

Only public catalog/review images are read. A match is a review hint, never an
automatic merge decision.
"""

import io
import logging
import math
from functools import lru_cache
from urllib.parse import urlsplit

import requests
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings
from PIL import Image, ImageOps, ImageStat, UnidentifiedImageError

from wine.image_utils import public_review_image_names
from wine.models import WineReviewImage


logger = logging.getLogger(__name__)
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_IMAGE_PIXELS = 36_000_000


@lru_cache(maxsize=1)
def _cosines():
    return [[math.cos((2 * x + 1) * u * math.pi / 64) for x in range(32)] for u in range(8)]


def _phash(image):
    pixels = list(ImageOps.fit(image.convert("L"), (32, 32), method=Image.Resampling.LANCZOS).getdata())
    basis = _cosines()
    rows = [[sum(pixels[y * 32 + x] * basis[u][x] for x in range(32)) for u in range(8)] for y in range(32)]
    coefficients = [sum(rows[y][u] * basis[v][y] for y in range(32)) for v in range(8) for u in range(8)]
    median = sorted(coefficients[1:])[31]
    bits = sum(1 << index for index, value in enumerate(coefficients) if value >= median)
    return f"{bits:016x}"


def fingerprint(image_file):
    with Image.open(image_file) as original:
        if original.width * original.height > MAX_IMAGE_PIXELS:
            raise ValueError("image dimensions exceed the fingerprint limit")
        image = ImageOps.exif_transpose(original)
        gray = image.convert("L").resize((64, 64))
        if ImageStat.Stat(gray).stddev[0] < 10:
            raise ValueError("image has too little detail")
        width, height = image.size
        label = image.crop((int(width * .15), int(height * .25), int(width * .85), int(height * .85)))
        label_color = ImageStat.Stat(label.convert("RGB").resize((64, 64))).median
        color = "".join(f"{int(channel):02x}" for channel in label_color)
        return _phash(image), _phash(label), color


def _trusted_catalog_url(url):
    hostname = (urlsplit(url).hostname or "").lower()
    domain = getattr(settings, "AWS_S3_CUSTOM_DOMAIN", "").lower()
    return urlsplit(url).scheme == "https" and bool(domain) and hostname == domain


def _remote_image(url):
    if not _trusted_catalog_url(url):
        raise ValueError("external image host is not the configured catalog storage")
    response = requests.get(url, timeout=(3, 8), stream=True, allow_redirects=False)
    response.raise_for_status()
    if response.status_code != 200 or response.headers.get("Content-Type", "").split(";")[0].lower() not in ("image/jpeg", "image/png", "image/webp"):
        raise ValueError("catalog URL did not return a supported image")
    data = bytearray()
    try:
        for chunk in response.iter_content(64 * 1024):
            data.extend(chunk)
            if len(data) > MAX_IMAGE_BYTES:
                raise ValueError("image exceeds the fingerprint size limit")
    finally:
        response.close()
    return io.BytesIO(data)


def save_wine_fingerprint(wine, *, include_remote=False, refresh=False):
    """Save one public cover fingerprint; return True when one was available."""
    if wine.image_hash and not refresh:
        return True
    try:
        if wine.image:
            with wine.image.open("rb") as image_file:
                hashes = fingerprint(image_file)
        elif wine.image_url:
            if not include_remote:
                return False
            hashes = fingerprint(_remote_image(wine.image_url))
        else:
            cover = public_review_image_names(wine.pk).first()
            if not cover:
                return False
            storage = WineReviewImage._meta.get_field("image").storage
            with storage.open(cover, "rb") as image_file:
                hashes = fingerprint(image_file)
    except (OSError, ValueError, UnidentifiedImageError, requests.RequestException, BotoCoreError, ClientError) as exc:
        logger.warning("Wine %s image fingerprint unavailable: %s", wine.pk, exc)
        return False
    wine.image_hash, wine.image_crop_hash, wine.image_color = hashes
    type(wine).objects.filter(pk=wine.pk).update(
        image_hash=hashes[0], image_crop_hash=hashes[1], image_color=hashes[2],
    )
    return True


def image_similarity(source, target):
    if not all((source.image_hash, source.image_crop_hash, source.image_color,
                target.image_hash, target.image_crop_hash, target.image_color)):
        return None
    try:
        full = (int(source.image_hash, 16) ^ int(target.image_hash, 16)).bit_count()
        crop = (int(source.image_crop_hash, 16) ^ int(target.image_crop_hash, 16)).bit_count()
        color_distance = sum(abs(int(source.image_color[index:index + 2], 16)
                                 - int(target.image_color[index:index + 2], 16))
                             for index in (0, 2, 4))
    except ValueError:
        return None
    # Require agreement in both the whole photo and the central label area.
    if color_distance > 120 or not ((full <= 8 and crop <= 14) or (crop <= 7 and full <= 18)):
        return None
    return round(1 - (full + crop) / 128, 3)

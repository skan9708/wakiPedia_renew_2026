"""Narrowly scoped exceptions for two bottles whose old metadata is wrong."""

from wine.verified_catalog_merges import CANONICAL_ENGLISH_NAMES

# The photographed bottle is Federico Paternina Banda Azul Cava, despite the
# source catalog row having been entered as a Tempranillo/Garnacha red wine.
MISLABELED_CAVA_SOURCE_ID = 5653
MISLABELED_CAVA_TARGET_ID = 8369
MISLABELED_CAVA_SOURCE_IMAGE_URL = (
    "https://wakipedia-media.s3.ap-northeast-2.amazonaws.com/media/wines/bubble/"
    "f1736941809173x841372457046631000.png"
)
MISLABELED_CAVA_TARGET_IMAGE_URL = (
    "https://wakipedia-media.s3.ap-northeast-2.amazonaws.com/media/wines/bubble/"
    "f1742614964537x188241143240925900.png"
)
MISLABELED_CAVA_SOURCE_GRAPES = {"가르나차", "템프라니요"}
MISLABELED_CAVA_TARGET_GRAPES = {"샤렐로", "마카베오", "빠레야다"}


def is_expected_mislabeled_cava(source_id, target_id, source, target, source_grapes, target_grapes):
    """Accept exactly the photo-verified 5653→8369 metadata mismatch."""
    return (
        source_id == MISLABELED_CAVA_SOURCE_ID
        and target_id == MISLABELED_CAVA_TARGET_ID
        and source["name"] == "federico paternina"
        and target["name"] in {
            "Federico paternina Cava Brut",
            CANONICAL_ENGLISH_NAMES.get(MISLABELED_CAVA_TARGET_ID),
        }
        and source["type"] in ("red", "레드")
        and target["type"] in ("sparkling", "스파클링")
        and source["country"] == "스페인"
        and target["country"] == "스페인"
        and source["image_url"] in (None, MISLABELED_CAVA_SOURCE_IMAGE_URL)
        and target["image_url"] in (None, MISLABELED_CAVA_TARGET_IMAGE_URL)
        and source_grapes == MISLABELED_CAVA_SOURCE_GRAPES
        and target_grapes == MISLABELED_CAVA_TARGET_GRAPES
    )


def is_expected_mislabeled_freixenet(
    source_id, target_id, source, target, source_grapes, target_grapes,
):
    """The 6437 label says Cordon Negro Gran Selección, not Chardonnay."""
    return (
        source_id == 6437
        and target_id == 5670
        and source["name"] == "Freixenet cordon negro seleccion cava"
        and target["name"] == "Freixenet, Cordon Negro Cava Brut"
        and source["type"] in ("sparkling", "스파클링")
        and target["type"] in ("sparkling", "스파클링")
        and source["country"] == "스페인"
        and target["country"] == "스페인"
        and source["image_url"] in (
            None,
            "https://wakipedia-media.s3.ap-northeast-2.amazonaws.com/media/wines/bubble/"
            "f1739537038064x679070129799539200.png",
        )
        and target["image_url"] in (
            None,
            "https://wakipedia-media.s3.ap-northeast-2.amazonaws.com/media/wines/bubble/"
            "f1736517214021x316296867841959300.png",
        )
        and source_grapes == {"샤도네이"}
        and target_grapes == {"마카베오", "샤렐로", "빠레야다"}
    )


PHOTO_METADATA_EXCEPTIONS = {
    MISLABELED_CAVA_SOURCE_ID: is_expected_mislabeled_cava,
    6437: is_expected_mislabeled_freixenet,
}

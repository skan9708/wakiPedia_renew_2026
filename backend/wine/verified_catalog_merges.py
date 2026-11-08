"""Bottle-label verified catalog merges approved on 2026-11-08.

Each entry is (source ID, representative ID, expected source name, expected
representative name). Vintages of the same named product share one wine page.
The names guard against applying the mapping to a different catalog export.
"""

PHOTO_VERIFIED_MERGES = (
    (7504, 4810, "Two Rivers Convergence Sauvignon Blanc", "Two Rivers Convergence Sauvignon Blanc"),
    (6836, 4821, "Bread & Butter Napa Pinot Noir", "Bread & Butter Pinot Noir"),
    (9182, 4874, "Champagne Charles de Cazanove Brut Nature", "Champagne Charles de Cazanove Brut"),
    (4935, 8280, "Champagne Dom Perignon", "Champagne dom perignon"),
    (4939, 8280, "champagne dom perignon", "Champagne dom perignon"),
    (5359, 5007, "champagne Piper Heidsieck brut", "Piper Heidsieck Cuvee Brut"),
    (5757, 5021, "Tommasi Amarone della Valpolicella Classico", "Tommasi Amarone della Valpolicella Classico"),
    (5998, 5048, "Mucho Mas", "Mucho Mas Red"),
    (5658, 5368, "penfolds koonunga hill shiraz", "Penfolds Koonunga Hill Shiraz"),
    (8980, 5577, "Olivier Leflaive Bourgogne", "Olivier Leflaive, Bourgogne Chardonnay"),
    (5730, 5670, "freixenet cordon negro", "Freixenet, Cordon Negro Cava Brut"),
    (8519, 5703, "Southern Ocean Sauvignon Blanc (South Africa)", "SOUTHERN OCEAN SAUVIGNON BLANC SOUTH AFRICA"),
    (5777, 8369, "Federico Paternina Cava", "Federico paternina Cava Brut"),
    (5920, 7813, "south reserva cabernet sauvignon", "35 South, Reserva Cabernet Sauvignon"),
    (6357, 5947, "Domaine de Tariqyet Classic", "Domaine de Tariquet Classic"),
    (8204, 6027, "Rue de la solf", "rue de la soip"),
    (8122, 6095, "Textbook, Cabernet Sauvignon", "Textbook Cabernet sauvignon"),
    (8359, 6095, "Textbook Cabernet Sauvignon", "Textbook Cabernet sauvignon"),
    (6768, 6170, "Dom Pérignon Vintage", "Dom Perignon Vintage"),
    (6322, 6470, "UNANIME", "Unanime"),
    (7969, 6706, "caymus cabernet sauvignon", "Caymus Cabernet Sauvignon"),
    (8853, 6706, "Caymus Cabernet Sauvignon", "Caymus Cabernet Sauvignon"),
    (8902, 6706, "Caymus Cabernet Sauvignon", "Caymus Cabernet Sauvignon"),
    (7146, 7786, "Saint Clair, Pioneer Block Sauvignon Blanc", "Saint Clair, Pioneer Block 25 Sauvignon Blanc"),
    (8543, 8640, "Arte Latino Cava", "Arte Latino Cava"),
)

PHOTO_VERIFIED_MAP = {source: target for source, target, _, _ in PHOTO_VERIFIED_MERGES}
PHOTO_VERIFIED_NAMES = {
    source: (source_name, target_name)
    for source, target, source_name, target_name in PHOTO_VERIFIED_MERGES
}

# These source names conflict with what the bottle actually shows. The old IDs
# still redirect, but their incorrect names must not become search aliases.
EXCLUDE_SOURCE_ALIASES = {9182}

# Both photos for 4874/9182 show Tête de Cuvée Brut, a different product from
# the producer's Brut Nature. Both 6027/8204 photos read "Rue de la Soif".
CANONICAL_ENGLISH_NAMES = {
    4874: "Charles de Cazanove Tête de Cuvée Brut",
    6027: "Rue de la Soif",
}

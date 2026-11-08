"""Bottle-label verified catalog merges approved on 2026-11-08.

Each entry is (source ID, representative ID, expected source name, expected
representative name). Vintages of the same named product share one wine page.
The names guard against applying the mapping to a different catalog export.
"""

PHOTO_VERIFIED_MERGES = (
    (4812, 6236, 'Guntrum Riesling', 'Guntrum, Riesling Royal Blue'),
    (4875, 4, 'MOET&CHANDON', 'moet & chandon imperial champagne brut'),
    (4935, 6170, 'Champagne Dom Perignon', 'Dom Perignon Vintage'),
    (4939, 6170, 'champagne dom perignon', 'Dom Perignon Vintage'),
    (4975, 4869, 'Eleve Carignan', 'Élevé Carignan'),
    (4978, 4810, 'Two rivers Sauvignon Blanc', 'Two Rivers Convergence Sauvignon Blanc'),
    (5144, 6170, 'dom perignon', 'Dom Perignon Vintage'),
    (5174, 4903, 'Lejeune-Dirvang Blanc de Blancs', 'Lejeune-Dirvang Blanc de Blancs'),
    (5198, 6990, "Vallebelbo Moscato d'Asti", "Moscato d'Asti Vallebelbo"),
    (5272, 5951, 'henri giraud esprit', 'Henri Giraud, Esprit Nature Brut'),
    (5359, 5007, 'champagne Piper Heidsieck brut', 'Piper Heidsieck Cuvee Brut'),
    (5439, 6025, 'Delas Crozes-Hermitage', 'Delas, Crozes Hermitage Rouge'),
    (5516, 5843, 'Bread&Butter', 'Bread&Butter, Cabernet Sauvignon'),
    (5567, 4809, 'allan scott', 'Allan Scott Sauvignon Blanc'),
    (5653, 8369, 'federico paternina', 'Federico paternina Cava Brut'),
    (5693, 8169, 'time waits for no one', 'Finca Bacara Time Waits for No One'),
    (5730, 5670, 'freixenet cordon negro', 'Freixenet, Cordon Negro Cava Brut'),
    (5757, 5021, 'Tommasi Amarone della Valpolicella Classico', 'Tommasi Amarone della Valpolicella Classico'),
    (5830, 5646, 'tinto pesquera', 'Tinto Pesquera Crianza'),
    (5920, 7813, 'south reserva cabernet sauvignon', '35 South, Reserva Cabernet Sauvignon'),
    (5998, 5048, 'Mucho Mas', 'Mucho Mas Red'),
    (6249, 5030, 'andre clouet', 'Andre Clouet, Grande Reserve Brut'),
    (6254, 6095, 'Textbook, Napa Valley Cabernet Sauvignon', 'Textbook Cabernet sauvignon'),
    (6322, 6470, 'UNANIME', 'Unanime'),
    (6348, 8169, 'TIME WAITS FOR NO ONE', 'Finca Bacara Time Waits for No One'),
    (6357, 5947, 'Domaine de Tariqyet Classic', 'Domaine de Tariquet Classic'),
    (6418, 5794, 'Louis M. Martini, Sonoma County', 'Louis M Martini Sonoma County Cabernet Sauvignon'),
    (6422, 5786, 'Chateau Ste. Michelle, Columbia Valley Cabernet Sauvignon 50th Anniversary', 'Chateau Ste. Michelle Cabernet Sauvignon'),
    (6437, 5670, 'Freixenet cordon negro seleccion cava', 'Freixenet, Cordon Negro Cava Brut'),
    (6541, 5282, 'Au bon climat', 'Au Bon Climat Pinot Noir'),
    (6558, 7597, 'Tommasi Ripasso Valpolicella Classico Superiore DOC', "Tommasi, 'Ripasso' Valpolicella"),
    (6625, 4869, 'Eleve carignan vieilles vignes', 'Élevé Carignan'),
    (6659, 8169, 'Time waits for no one', 'Finca Bacara Time Waits for No One'),
    (6768, 6170, 'Dom Pérignon Vintage', 'Dom Perignon Vintage'),
    (6776, 6363, 'Champagne G.H.Mumm Gran Cordon', 'G.H.Mumm, Grand Cordon'),
    (6836, 4821, 'Bread & Butter Napa Pinot Noir', 'Bread & Butter Pinot Noir'),
    (6844, 5282, 'Au Bon Climat', 'Au Bon Climat Pinot Noir'),
    (6856, 6581, 'Escudo Rojo', 'Escudo rojo syrah'),
    (6979, 5561, 'Albert Bichot Chablis 1er', "Albert Bichot, Chablis 1er Cru Reserve de l'Orangerie"),
    (7047, 6706, 'Caymus', 'Caymus Cabernet Sauvignon'),
    (7146, 7786, 'Saint Clair, Pioneer Block Sauvignon Blanc', 'Saint Clair, Pioneer Block 25 Sauvignon Blanc'),
    (7207, 6236, 'Guntrum riesling', 'Guntrum, Riesling Royal Blue'),
    (7403, 6170, 'Dom Perignon, Brut', 'Dom Perignon Vintage'),
    (7504, 4810, 'Two Rivers Convergence Sauvignon Blanc', 'Two Rivers Convergence Sauvignon Blanc'),
    (7538, 5523, 'Marchese Antinori chianti classico riserva', 'Marchese Antinori Chianti Classico Riserva'),
    (7570, 5064, 'Lincoln Cabernet Sauvignon', 'Lincoln Cabernet Sauvignon Napa Valley'),
    (7589, 7274, 'Pol Roger, Blanc de Blancs Brut', 'Pol Roger Blanc de Blancs Champagne'),
    (7636, 5484, 'Marqués de Casa Concha Cabernet Sauvignon', 'Marques de Casa Concha'),
    (7644, 5786, 'Chateau Ste. Michelle, Columbia Valley Cabernet Sauvignon', 'Chateau Ste. Michelle Cabernet Sauvignon'),
    (7735, 5276, 'Egomei, Rioja', 'Egomei'),
    (7854, 5463, 'robert mondavi cabernet sauvignon', 'Robert Mondavi Cabernet Sauvignon'),
    (7860, 4821, 'bread&butter', 'Bread & Butter Pinot Noir'),
    (7912, 8369, 'Federico Paternina, Cava Brut Special Edition', 'Federico paternina Cava Brut'),
    (7969, 6706, 'caymus cabernet sauvignon', 'Caymus Cabernet Sauvignon'),
    (8122, 6095, 'Textbook, Cabernet Sauvignon', 'Textbook Cabernet sauvignon'),
    (8181, 8699, 'Henri Bourgeois Sancerre', 'Henri Bourgeois, Sancerre Les Baronnes'),
    (8204, 6027, 'Rue de la solf', 'rue de la soip'),
    (8225, 5893, 'bourgogne', 'Louis Jadot Bourgogne Pinot Noir'),
    (8260, 8214, 'awatere', 'Awatere Sauvignon Blanc'),
    (8268, 5627, 'kim crawford', 'Kim Crawford, Marlborough Sauvignon Blanc'),
    (8280, 6170, 'Champagne dom perignon', 'Dom Perignon Vintage'),
    (8302, 6025, 'Delas Crozes-Hermitage', 'Delas, Crozes Hermitage Rouge'),
    (8359, 6095, 'Textbook Cabernet Sauvignon', 'Textbook Cabernet sauvignon'),
    (8380, 9485, 'Bailly Lapierre Cremant de Bourgogne', 'Bailly Lapierre Cremant de Bourgogne Pinot Noir'),
    (8409, 7832, 'Joseph Drouhin, Chablis Premier Cru', 'Joseph Drouhin, Chablis'),
    (8412, 5145, 'Duval leroy', 'Duval-Leroy Brut Reserve'),
    (8463, 8812, 'Carpenè Malvolti', 'Carpene Malvolti Prosecco'),
    (8519, 5703, 'Southern Ocean Sauvignon Blanc (South Africa)', 'SOUTHERN OCEAN SAUVIGNON BLANC SOUTH AFRICA'),
    (8522, 5306, 'Charles Heidsieck', 'Champagne Charles Heidsieck Brut Reserve'),
    (8543, 8640, 'Arte Latino Cava', 'Arte Latino Cava'),
    (8552, 8269, 'Diablo cabernet sauvignon', 'Casillero del Diablo Cabernet Sauvignon'),
    (8588, 5745, 'scagliola', 'Scagliola Piemonte Chardonnay'),
    (8820, 4810, 'TWO RIVERS', 'Two Rivers Convergence Sauvignon Blanc'),
    (8853, 6706, 'Caymus Cabernet Sauvignon', 'Caymus Cabernet Sauvignon'),
    (8902, 6706, 'Caymus Cabernet Sauvignon', 'Caymus Cabernet Sauvignon'),
    (8971, 5786, 'Chateau Ste. Michelle Cabernet Sauvignon 50 years', 'Chateau Ste. Michelle Cabernet Sauvignon'),
    (8980, 5577, 'Olivier Leflaive Bourgogne', 'Olivier Leflaive, Bourgogne Chardonnay'),
    (8996, 7038, 'Roberto Voerzio San Francesco Fontanazza Langhe Nebbiolo', "Roberto Voerzio, Langhe Nebbiolo 'Disanfrancesco'"),
    (9062, 7499, 'Nahe Riesling', 'NAHE RIESLING'),
    (9063, 7973, 'Bel Colle barolo', 'Bel Colle Barolo Riserva 10 Anni'),
    (9103, 6284, 'Black Stallion', 'Black Stallion Cabernet Sauvignon'),
    (9182, 4874, 'Champagne Charles de Cazanove Brut Nature', 'Champagne Charles de Cazanove Brut'),
    (9183, 7815, 'Cousino-Macul Antiguas Reservas', 'Cousino Macul, Antiguas Reserva Cabernet Sauvignon'),
    (9184, 8765, 'The long little dog rose', 'The Long Little Dog Rosé'),
    (9192, 8936, 'Gruner Veltliner Kremstal', 'Gruner Veltliner kremstal'),
    (9378, 7551, 'Jayer-Gilles Hautes Cotes de Nuits A.O.C', "Jayer-Gilles, Bourgogne 'Hautes-Cotes de nuits' Rouge"),
    (9541, 6706, 'Caymus C/S', 'Caymus Cabernet Sauvignon'),
)

PHOTO_VERIFIED_MAP = {source: target for source, target, _, _ in PHOTO_VERIFIED_MERGES}
PHOTO_VERIFIED_NAMES = {
    source: (source_name, target_name)
    for source, target, source_name, target_name in PHOTO_VERIFIED_MERGES
}

# These source names conflict with what the bottle actually shows. The old IDs
# still redirect, but their incorrect names must not become search aliases.
EXCLUDE_SOURCE_ALIASES = {5653, 6836, 8409, 9182}

# Both photos for 4874/9182 show Tête de Cuvée Brut, a different product from
# the producer's Brut Nature. Both 6027/8204 photos read "Rue de la Soif".
CANONICAL_ENGLISH_NAMES = {
    4874: "Charles de Cazanove Tête de Cuvée Brut",
    5658: "Penfolds Koonunga Hill Shiraz Cabernet",
    5777: "Federico Paternina Cava Organic",
    6027: "Rue de la Soif",
    8369: "Federico Paternina Banda Azul Vintage Brut Cava",
}

CANONICAL_KOREAN_NAMES = {
    5658: "펜폴즈 쿠눈가 힐 쉬라즈 카베르네",
    5777: "페데리코 파테르니나 까바 오가닉",
    8369: "페데리코 파테르니나 반다 아줄 빈티지 브뤼 까바",
}

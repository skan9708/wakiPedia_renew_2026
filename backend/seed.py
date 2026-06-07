"""
초기 데이터 시드 스크립트
실행: python seed.py
"""
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "wakipedia.settings")
django.setup()

from wine.models import Tag, Country, GrapeVariety, Wine

TAGS = {
    "fruity": [
        "크랜베리", "블랙베리", "무화과", "체리", "블루베리", "포도", "청사과", "사과",
        "건포도", "딸기", "복숭아", "망고", "멜론", "라임", "레몬", "오렌지",
        "배", "자몽", "자두", "바나나", "파인애플", "살구", "패션프룻", "과실향",
    ],
    "floral": [
        "아카시아", "장미", "자스민", "라일락", "바이올렛", "꿀", "작약",
        "라벤더", "말린 꽃", "아이리스", "백합", "제비꽃", "꽃향",
    ],
    "oaky": [
        "카카오", "헤이즐넛", "바닐라", "초콜릿", "아몬드", "코코넛", "캐러멜",
        "스모크", "모카", "커피", "인센스", "마카다미아", "캐슈넛", "타르",
        "피스타치오", "후추", "계피", "오크향",
    ],
    "vegetal": [
        "유칼립투스", "로즈마리", "타임", "딜", "민트", "홍차", "바질",
        "토바코", "월계수", "토마토", "피망", "잔디", "얼그레이", "고수", "솔향", "허브향",
    ],
}

COUNTRIES = [
    ("France", "프랑스"), ("Italy", "이탈리아"), ("Spain", "스페인"),
    ("USA", "미국"), ("Australia", "호주"), ("Chile", "칠레"),
    ("Argentina", "아르헨티나"), ("Germany", "독일"), ("Portugal", "포르투갈"),
    ("New Zealand", "뉴질랜드"), ("South Africa", "남아프리카공화국"),
    ("Austria", "오스트리아"), ("Greece", "그리스"), ("Hungary", "헝가리"),
]

GRAPES = [
    ("Cabernet Sauvignon", "까베르네 소비뇽"), ("Merlot", "메를로"),
    ("Pinot Noir", "피노 누아"), ("Syrah/Shiraz", "시라/쉬라즈"),
    ("Chardonnay", "샤르도네"), ("Sauvignon Blanc", "소비뇽 블랑"),
    ("Riesling", "리슬링"), ("Pinot Grigio", "피노 그리지오"),
    ("Tempranillo", "템프라니요"), ("Sangiovese", "산지오베제"),
    ("Grenache", "그르나슈"), ("Malbec", "말벡"),
    ("Zinfandel", "진판델"), ("Cabernet Franc", "까베르네 프랑"),
    ("Viognier", "비오니에"), ("Gewurztraminer", "게뷔르츠트라미너"),
    ("Muscat", "머스캣"), ("Nebbiolo", "네비올로"),
    ("Barbera", "바르베라"), ("Montepulciano", "몬테풀치아노"),
]

WINES_SEED = [
    {
        "kor_name": "샤또몽페라", "eng_name": "Chateau Mont-Perat",
        "type": "red", "country": "프랑스",
        "grapes": ["메를로", "까베르네 프랑"],
    },
    {
        "kor_name": "오퍼스 원", "eng_name": "Opus One",
        "type": "red", "country": "미국",
        "grapes": ["까베르네 소비뇽", "메를로"],
    },
    {
        "kor_name": "빌라 마리아 소비뇽 블랑", "eng_name": "Villa Maria Sauvignon Blanc",
        "type": "white", "country": "뉴질랜드",
        "grapes": ["소비뇽 블랑"],
    },
    {
        "kor_name": "모엣 샹동 임페리얼", "eng_name": "Moet & Chandon Imperial",
        "type": "sparkling", "country": "프랑스",
        "grapes": ["샤르도네", "피노 누아"],
    },
    {
        "kor_name": "킴 크로포드 소비뇽 블랑", "eng_name": "Kim Crawford Sauvignon Blanc",
        "type": "white", "country": "뉴질랜드",
        "grapes": ["소비뇽 블랑"],
    },
    {
        "kor_name": "바롤로 리제르바", "eng_name": "Barolo Riserva",
        "type": "red", "country": "이탈리아",
        "grapes": ["네비올로"],
    },
    {
        "kor_name": "리오하 그란 레세르바", "eng_name": "Rioja Gran Reserva",
        "type": "red", "country": "스페인",
        "grapes": ["템프라니요"],
    },
    {
        "kor_name": "콜롬보 로제", "eng_name": "Colombo Rose",
        "type": "rose", "country": "프랑스",
        "grapes": ["그르나슈"],
    },
]


def run():
    print("태그 시드...")
    for category, names in TAGS.items():
        for name in names:
            Tag.objects.get_or_create(name=name, defaults={"category": category})
    print(f"  태그 {Tag.objects.count()}개")

    print("국가 시드...")
    country_map = {}
    for eng, kor in COUNTRIES:
        c, _ = Country.objects.get_or_create(kor_name=kor, defaults={"eng_name": eng})
        country_map[kor] = c
    print(f"  국가 {Country.objects.count()}개")

    print("품종 시드...")
    grape_map = {}
    for eng, kor in GRAPES:
        g, _ = GrapeVariety.objects.get_or_create(kor_name=kor, defaults={"eng_name": eng})
        grape_map[kor] = g
    print(f"  품종 {GrapeVariety.objects.count()}개")

    print("와인 시드...")
    for w in WINES_SEED:
        country = country_map.get(w["country"])
        wine, created = Wine.objects.get_or_create(
            eng_name=w["eng_name"],
            defaults={
                "kor_name": w["kor_name"],
                "type": w["type"],
                "country": country,
            },
        )
        if created:
            for grape_kor in w.get("grapes", []):
                if grape_kor in grape_map:
                    wine.grape_varieties.add(grape_map[grape_kor])
    print(f"  와인 {Wine.objects.count()}개")

    print("완료!")


if __name__ == "__main__":
    run()

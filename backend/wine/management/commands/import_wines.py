import json
from django.core.management.base import BaseCommand
from wine.models import Wine, Country

RED_KEYWORDS = [
    'cabernet', 'merlot', 'syrah', 'shiraz', 'malbec', 'pinot noir', 'tempranillo',
    'sangiovese', 'nebbiolo', 'grenache', 'carmenere', 'barbera', 'montepulciano',
    'primitivo', 'zinfandel', 'monastrell', 'nero', 'pinotage', 'touriga',
    '카베르네', '메를로', '시라', '말벡', '피노누아', '템프라니요', '산지오베제',
    '그르나슈', '바르베라', '몬테풀치아노', '피노타주', '레드', '카르메네르',
]
WHITE_KEYWORDS = [
    'chardonnay', 'sauvignon blanc', 'riesling', 'pinot gris', 'pinot grigio',
    'gewurztraminer', 'viognier', 'albarino', 'chenin blanc', 'muscat', 'moscato',
    'vermentino', 'soave', 'gruner', 'torrontes', 'verdejo', 'verdicchio',
    'gewürztraminer', 'albariño',
    '샤르도네', '소비뇽블랑', '리슬링', '피노그리', '모스카토', '뮈스카',
    '슈냉블랑', '비오니에', '화이트', '게뷔르츠트라미너',
]
SPARKLING_KEYWORDS = [
    'prosecco', 'champagne', 'cava', 'cremant', 'crémant', 'sparkling', 'sekt',
    'pétillant', 'petillant', 'lambrusco', 'asti',
    '스파클링', '샴페인', '프로세코', '까바', '크레망',
]
ROSE_KEYWORDS = [
    'rosé', 'rose', '로제',
]


def infer_type(eng_name: str, kor_name: str) -> str:
    combined = (eng_name + ' ' + kor_name).lower()
    for kw in SPARKLING_KEYWORDS:
        if kw.lower() in combined:
            return 'sparkling'
    for kw in ROSE_KEYWORDS:
        if kw.lower() in combined:
            return 'rose'
    for kw in WHITE_KEYWORDS:
        if kw.lower() in combined:
            return 'white'
    for kw in RED_KEYWORDS:
        if kw.lower() in combined:
            return 'red'
    return ''


class Command(BaseCommand):
    help = 'Bubble에서 내보낸 와인 JSON 데이터를 DB에 임포트합니다.'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='JSON 파일 경로')
        parser.add_argument('--clear', action='store_true', help='임포트 전 기존 와인 데이터 전체 삭제')

    def handle(self, *args, **options):
        json_file = options['json_file']

        if options['clear']:
            count = Wine.objects.all().count()
            Wine.objects.all().delete()
            self.stdout.write(self.style.WARNING(f'기존 와인 {count}개 삭제됨'))

        with open(json_file, encoding='utf-8') as f:
            data = json.load(f)

        self.stdout.write(f'총 {len(data)}개 항목 처리 시작...')

        created = 0
        skipped = 0
        errors = 0
        type_counts = {'red': 0, 'white': 0, 'sparkling': 0, 'rose': 0, '': 0}

        for item in data:
            eng_name = (item.get('Name_ENG') or '').strip()
            kor_name = (item.get('Name_KR') or '').strip()
            region = (item.get('Regions') or '').strip()
            raw_img = (item.get('WineIMG') or '').strip()
            raw_rating = (item.get('RatingAverge') or '').strip()

            if not kor_name and not eng_name:
                skipped += 1
                continue

            eng_name = eng_name or kor_name
            kor_name = kor_name or eng_name

            # 평점 파싱
            bubble_rating = None
            if raw_rating:
                try:
                    bubble_rating = round(float(raw_rating), 1)
                except ValueError:
                    pass

            existing = Wine.objects.filter(kor_name=kor_name, eng_name=eng_name).first()
            if existing:
                if bubble_rating is not None and existing.bubble_avg_rating is None:
                    existing.bubble_avg_rating = bubble_rating
                    existing.save(update_fields=['bubble_avg_rating'])
                skipped += 1
                continue

            # 이미지 URL (protocol-relative → https)
            image_url = ''
            if raw_img:
                image_url = ('https:' + raw_img) if raw_img.startswith('//') else raw_img

            country = None
            if region:
                country, _ = Country.objects.get_or_create(
                    kor_name=region,
                    defaults={'eng_name': region},
                )

            wine_type = infer_type(eng_name, kor_name)
            type_counts[wine_type] = type_counts.get(wine_type, 0) + 1

            try:
                Wine.objects.create(
                    eng_name=eng_name,
                    kor_name=kor_name,
                    type=wine_type,
                    country=country,
                    image_url=image_url,
                    bubble_avg_rating=bubble_rating,
                )
                created += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'오류 ({kor_name}): {e}'))
                errors += 1

        self.stdout.write(self.style.SUCCESS(
            f'\n완료: {created}개 등록 / {skipped}개 스킵 / {errors}개 오류'
        ))
        self.stdout.write(f'타입 분류: 레드 {type_counts["red"]} / 화이트 {type_counts["white"]} / 스파클링 {type_counts["sparkling"]} / 로제 {type_counts["rose"]} / 미분류 {type_counts[""]}')

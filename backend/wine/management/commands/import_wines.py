import json
from django.core.management.base import BaseCommand
from wine.models import Wine, Country


class Command(BaseCommand):
    help = 'Bubble에서 내보낸 와인 JSON 데이터를 DB에 임포트합니다.'

    def add_arguments(self, parser):
        parser.add_argument('json_file', type=str, help='JSON 파일 경로')
        parser.add_argument(
            '--clear',
            action='store_true',
            help='임포트 전 기존 와인 데이터 전체 삭제',
        )

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

        for item in data:
            eng_name = (item.get('Name_ENG') or '').strip()
            kor_name = (item.get('Name_KR') or '').strip()
            region = (item.get('Regions') or '').strip()

            if not kor_name and not eng_name:
                skipped += 1
                continue

            eng_name = eng_name or kor_name
            kor_name = kor_name or eng_name

            # 중복 체크
            if Wine.objects.filter(kor_name=kor_name, eng_name=eng_name).exists():
                skipped += 1
                continue

            country = None
            if region:
                country, _ = Country.objects.get_or_create(
                    kor_name=region,
                    defaults={'eng_name': region},
                )

            try:
                Wine.objects.create(
                    eng_name=eng_name,
                    kor_name=kor_name,
                    type='',
                    country=country,
                )
                created += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'오류 ({kor_name}): {e}'))
                errors += 1

        self.stdout.write(self.style.SUCCESS(
            f'\n완료: {created}개 등록 / {skipped}개 스킵 / {errors}개 오류'
        ))

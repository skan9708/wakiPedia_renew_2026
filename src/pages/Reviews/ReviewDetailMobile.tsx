import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { CardReview, Review } from '@/components/common/CardReview';
import { RatingStars } from '@/components/common/RatingStars';
import { Share2 } from 'lucide-react';

export function ReviewDetailMobile() {
  const { id } = useParams();
  const review: Review = {
    id: id ?? '0',
    wineId: 'montperat',
    creator: { id: 'u1', nickname: '와키' },
    rating: 4.2,
    text: '풍부한 과실향과 균형 잡힌 바디감이 매력적입니다. 스모키한 오크 터치가 길게 남네요.',
    likeCount: 12,
    createdAt: new Date().toISOString(),
    feels: ['블랙베리','바닐라','허브향'],
  };

  const wine = useMemo(() => ({
    nameEng: 'Chateau Mont-Perat',
    nameKr: '샤또몽페라',
    imageUrl: 'https://plus.unsplash.com/premium_photo-1682097091093-dd18b37764a5?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    regions: 'France',
    breed: 'Merlot, Cabernet Franc',
  }), []);

  const features = {
    body: 2,
    sweet: 1,
    acid: 2,
    tanin: 1,
  };

  return (
    <div className="space-y-5">
      {/* 업로드한 사진 */}
      <div className="w-full aspect-[16/10] bg-bgsubtle overflow-hidden">
        <img src={wine.imageUrl} alt={wine.nameKr} className="w-full h-full object-cover" />
      </div>

      {/* 헤더/공유 */}
      <div className="px-4 flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-fg">{wine.nameEng}</div>
          <div className="text-sm text-muted">{wine.nameKr}</div>
        </div>
        <button className="px-3 py-1.5 rounded-full bg-bgsubtle text-sm flex items-center gap-2">
          <Share2 className="w-4 h-4" /> 공유하기
        </button>
      </div>

      {/* 리뷰 텍스트 + 별점 */}
      <div className="px-4">
        <div className="card p-4 border border-border">
          <div className="flex items-center gap-2">
            <RatingStars value={review.rating} size="md" />
            <span className="text-accent text-sm">{review.rating.toFixed(1)} 점</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed">{review.text}</p>
        </div>
      </div>

      {/* 느낌 */}
      <div className="px-4">
        <h3 className="text-base font-semibold mb-2">느낌</h3>
        <div className="flex flex-wrap gap-2">
          {(review.feels ?? []).map((t) => (
            <span key={t} className="px-3 py-1.5 rounded-full bg-bgsubtle text-sm">{t}</span>
          ))}
        </div>
      </div>

      {/* 입력한 특징 - 게이지 */}
      <div className="px-4">
        <h3 className="text-base font-semibold mb-2">특징</h3>
        <div className="space-y-4">
          <DetailGauge title="바디" left="매우 가벼움" right="매우 무거움" value={features.body} />
          <DetailGauge title="당도" left="매우 드라이" right="매우 스윗" value={features.sweet} />
          <DetailGauge title="산도" left="매우 부드러움" right="매우 시다" value={features.acid} />
          <DetailGauge title="탄닌" left="매우 부드러움" right="매우 떫음" value={features.tanin} />
        </div>
      </div>
    </div>
  );
}

type DGProps = { title: string; left: string; right: string; value: number };
function DetailGauge({ title, left, right, value }: DGProps) {
  const fillPct = `${(value / 4) * 100}%`;
  return (
    <div className="flex items-center gap-2">
      <div className="w-12 shrink-0 text-sm text-muted">{title}</div>
      <div className="flex-1">
        <div className="relative h-10">
          <div className="absolute -top-4 left-0 text-[12px] text-muted">{left}</div>
          <div className="absolute -top-4 right-0 text-[12px] text-muted">{right}</div>
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[4px] bg-neutral-200 rounded-full" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[4px] bg-accent rounded-full" style={{ width: fillPct }} />
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-10 flex items-center justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`w-4 h-4 rounded-full border-2 ${i <= value ? 'bg-accent border-accent' : 'bg-white border-neutral-300'}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}



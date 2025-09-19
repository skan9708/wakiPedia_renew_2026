import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CardReview, Review } from '@/components/common/CardReview';
import { RatingStars } from '@/components/common/RatingStars';
import { Heart } from 'lucide-react';

const reviewsSeed: Review[] = Array.from({ length: 3 }).map((_, i) => ({
  id: String(i + 1),
  wineId: 'montperat',
  creator: { id: `u${i+1}`, nickname: i===0 ? '치킨' : i===1 ? '와키' : '시음러' },
  rating: 3.5 + (i % 2),
  text: i===0 ? '이것은 테스트 리뷰 입니다.' : '풍부한 향과 밸런스가 좋았습니다.',
  likeCount: 1 + i,
  createdAt: new Date().toISOString(),
}));

export function WineDetailMobile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const wine = useMemo(() => ({
    id: id ?? 'montperat',
    nameKr: '샤또몽페라',
    nameEng: 'Chateau Mont-Perat',
    regions: 'France',
    breed: 'Merlot, Cabernet Franc',
    tags: ['프랑스', '메를로', '까베르네프랑'],
    imageUrl: 'https://plus.unsplash.com/premium_photo-1682097091093-dd18b37764a5?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    ratingAverage: 4.5,
  }), [id]);

  const reviews = reviewsSeed;
  const [isFav, setIsFav] = useState(false);

  return (
    <div className="space-y-4">
      {/* 이미지 */}
      <div className="w-full aspect-[16/10] bg-bgsubtle overflow-hidden pt-3">
        <img src={wine.imageUrl} alt={wine.nameKr} className="w-full h-full object-cover" />
      </div>

      {/* 타이틀 */}
      <div className="px-4">
        <div className="flex items-center gap-2">
          <div className="text-xl font-semibold text-fg">{wine.nameEng}</div>
          <button
            type="button"
            aria-label={isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            onClick={() => setIsFav((v) => !v)}
            className={`p-1 -m-1 ${isFav ? 'text-accent' : 'text-muted'}`}
          >
            <Heart className="w-5 h-5" fill={isFav ? 'currentColor' : 'none'} />
          </button>
        </div>
        <div className="text-sm text-muted mt-1">{wine.nameKr}</div>

        <div className="flex flex-wrap gap-2 mt-3">
          {wine.tags.map((t) => (
            <span key={t} className="px-2 py-1 rounded-full bg-bgsubtle text-xs text-muted">{t}</span>
          ))}
        </div>

        <div className="text-sm text-muted mt-2">
          {wine.regions} · <span className="text-accent">{wine.breed}</span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <RatingStars value={Number(wine.ratingAverage)} size="md" />
          <span className="text-accent text-base font-medium">{Number(wine.ratingAverage).toFixed(1)} 점</span>
        </div>

        {/* 행동 영역 */}
        <div className="mt-4 grid grid-cols-1 gap-2">
          <button className="w-full py-3 rounded-2xl bg-accent text-white" onClick={() => navigate('/reviews/new')}>리뷰 등록하기</button>
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/wines/${wine.id}/edit`)}
            onKeyDown={(e) => (e.key === 'Enter' ? navigate(`/wines/${wine.id}/edit`) : null)}
            aria-label="와인 정보 수정하기"
            className="text-[12px] text-neutral-400 self-end cursor-pointer select-none"
          >
            와인 정보 수정하기
          </div>
        </div>
      </div>

      {/* 리뷰 목록 */}
      <div className="px-4 space-y-3">
        {reviews.map((r) => (
          <div key={r.id} onClick={() => navigate(`/reviews/${r.id}`)}>
            <CardReview review={r} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default WineDetailMobile;



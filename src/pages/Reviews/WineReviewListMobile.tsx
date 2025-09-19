import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CardReview, Review } from '@/components/common/CardReview';
import { Tag } from '@/components/common/Tag';

const reviews: Review[] = Array.from({ length: 6 }).map((_, i) => ({
  id: String(i),
  wineId: '1',
  creator: { id: 'u1', nickname: `유저 ${i + 1}` },
  rating: (Math.random() * 2 + 3),
  text: '산뜻한 산미와 과실향이 특징적인 와인입니다. 가격 대비 훌륭해요.',
  likeCount: Math.floor(Math.random() * 30),
  createdAt: new Date().toISOString(),
}));

export function WineReviewListMobile() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const tab = params.get('tab') ?? 'all';
  const sort = params.get('sort') ?? 'popular';
  const list = useMemo(() => {
    let base = [...reviews];
    if (sort === 'popular') base.sort((a,b) => b.likeCount - a.likeCount);
    if (sort === 'latest') base.sort((a,b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    return base;
  }, [sort]);
  return (
    <div className="space-y-4">
      {/* 상단 필터 */}
      <div className="mx-auto w-full max-w-mobile px-4 pt-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'all', label: '전체' },
            { key: 'popular', label: '인기 리뷰' },
            { key: 'latest', label: '최신 리뷰' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => navigate(`/reviews?tab=${t.key}`)}
              className={`px-3 py-1.5 rounded-full text-sm border ${tab===t.key ? 'bg-accent text-white border-accent' : 'border-border'}`}
              aria-pressed={tab===t.key}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 리스트 (와인 리스트와 동일한 레이아웃 간격) */}
      <div className="grid grid-cols-1 gap-10 mt-0">
        {list.map((r) => (
          <div key={r.id} className="mx-auto w-full max-w-mobile px-4" onClick={() => navigate(`/reviews/${r.id}`)}>
            <CardReview review={r} />
          </div>
        ))}
      </div>
    </div>
  );
}



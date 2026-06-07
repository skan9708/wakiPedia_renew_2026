import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CardReview, Review } from '@/components/common/CardReview';
import { api } from '@/lib/api';

export function WineReviewListMobile() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sort = params.get('sort') ?? 'latest';
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/reviews/?sort=${sort}`)
      .then(({ data }) => setReviews(data))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [sort]);

  return (
    <div className="space-y-4">
      <div className="mx-auto w-full max-w-mobile px-4 pt-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {[
            { key: 'latest', label: '최신 리뷰' },
            { key: 'popular', label: '인기 리뷰' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => navigate(`/reviews?sort=${t.key}`)}
              className={`px-3 py-1.5 rounded-full text-sm border ${sort === t.key ? 'bg-accent text-white border-accent' : 'border-border'}`}
              aria-pressed={sort === t.key}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 mt-0">
        {loading && (
          <div className="mx-auto w-full max-w-mobile px-4">
            <p className="text-center text-sm text-muted py-8">불러오는 중...</p>
          </div>
        )}
        {!loading && reviews.length === 0 && (
          <div className="mx-auto w-full max-w-mobile px-4">
            <p className="text-center text-sm text-muted py-8">리뷰가 없습니다.</p>
          </div>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="mx-auto w-full max-w-mobile px-4" onClick={() => navigate(`/reviews/${r.id}`)}>
            <CardReview review={r} />
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CardReview, Review } from '@/components/common/CardReview';
import { api } from '@/lib/api';

export function WineReviewListMobile() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sort = params.get('sort') ?? 'latest';

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 탭 바뀌면 초기화
  useEffect(() => {
    setReviews([]);
    setPage(1);
    setHasNext(false);
    setLoading(true);
    api.get(`/reviews/?sort=${sort}&page=1&limit=10`)
      .then(({ data }) => {
        setReviews(data.results ?? []);
        setHasNext(data.hasNext ?? false);
      })
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [sort]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasNext) return;
    const next = page + 1;
    setLoadingMore(true);
    api.get(`/reviews/?sort=${sort}&page=${next}&limit=10`)
      .then(({ data }) => {
        setReviews((prev) => [...prev, ...(data.results ?? [])]);
        setHasNext(data.hasNext ?? false);
        setPage(next);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [sort, page, hasNext, loadingMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

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

      <div className="grid grid-cols-1 gap-3 mt-0">
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

        <div ref={sentinelRef} className="h-4" />

        {loadingMore && (
          <div className="mx-auto w-full max-w-mobile px-4">
            <p className="text-center text-sm text-muted py-4">불러오는 중...</p>
          </div>
        )}
        {!hasNext && reviews.length > 0 && (
          <div className="mx-auto w-full max-w-mobile px-4 pb-4">
            <p className="text-center text-xs text-muted">총 {reviews.length}개의 리뷰</p>
          </div>
        )}
      </div>
    </div>
  );
}

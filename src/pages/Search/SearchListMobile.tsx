import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SearchBar } from '@/components/common/SearchBar';
import { CardWine, Wine } from '@/components/common/CardWine';
import FilterSheet, { FilterValues } from '@/components/search/FilterSheet';
import { api } from '@/lib/api';

export function SearchListMobile() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const q = params.get('q') ?? '';
  const current: FilterValues = {
    wineType: (params.get('type') as FilterValues['wineType']) ?? undefined,
    region: params.get('region') ?? undefined,
    breed: params.get('breed') ?? undefined,
    sort: (params.get('sort') as FilterValues['sort']) ?? undefined,
  };

  const buildQuery = useCallback((p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (current.wineType) sp.set('type', current.wineType);
    if (current.region) sp.set('country', current.region);
    if (current.breed) sp.set('breed', current.breed);
    if (current.sort) sp.set('sort', current.sort);
    sp.set('page', String(p));
    sp.set('limit', '20');
    return sp.toString();
  }, [params.toString()]);

  // 필터 변경 시 초기화
  useEffect(() => {
    setWines([]);
    setPage(1);
    setHasNext(false);
    setLoading(true);
    api.get(`/wines/?${buildQuery(1)}`)
      .then(({ data }) => {
        setWines(data.results ?? []);
        setHasNext(data.hasNext ?? false);
        setPage(1);
      })
      .catch(() => setWines([]))
      .finally(() => setLoading(false));
  }, [params.toString()]);

  // 다음 페이지 로드
  const loadMore = useCallback(() => {
    if (loadingMore || !hasNext) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    api.get(`/wines/?${buildQuery(nextPage)}`)
      .then(({ data }) => {
        setWines((prev) => [...prev, ...(data.results ?? [])]);
        setHasNext(data.hasNext ?? false);
        setPage(nextPage);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [page, hasNext, loadingMore, buildQuery]);

  // IntersectionObserver로 무한스크롤
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
    <div className="space-y-2">
      <div className="sticky top-16 z-30 pt-2 pb-2 bg-white">
        <div className="mx-auto w-full max-w-mobile px-4 space-y-3">
          <SearchBar />
          <button
            className="w-full py-2 rounded-2xl border border-accent text-accent text-sm"
            onClick={() => setOpen(true)}
          >
            검색 필터
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-0">
        {loading && (
          <div className="mx-auto w-full max-w-mobile px-4">
            <p className="text-center text-sm text-muted py-8">불러오는 중...</p>
          </div>
        )}
        {!loading && wines.length === 0 && (
          <div className="mx-auto w-full max-w-mobile px-4">
            <div className="card p-6 text-center">
              <div className="text-sm text-muted mb-3">검색 결과가 없습니다.</div>
              <button
                className="w-full py-3 rounded-2xl bg-accent text-white"
                onClick={() => navigate('/wines/new')}
              >
                새로운 와인 등록하기
              </button>
            </div>
          </div>
        )}
        {wines.map((w) => (
          <div key={w.id} className="mx-auto w-full max-w-mobile px-4">
            <CardWine wine={w} onClick={() => navigate(`/wines/${w.id}`)} />
          </div>
        ))}

        {/* 무한스크롤 sentinel */}
        <div ref={sentinelRef} className="h-4" />

        {loadingMore && (
          <div className="mx-auto w-full max-w-mobile px-4">
            <p className="text-center text-sm text-muted py-4">더 불러오는 중...</p>
          </div>
        )}
        {!hasNext && wines.length > 0 && (
          <div className="mx-auto w-full max-w-mobile px-4 pb-4">
            <p className="text-center text-xs text-muted">총 {wines.length}개의 와인</p>
          </div>
        )}
      </div>

      <FilterSheet
        open={open}
        onClose={() => setOpen(false)}
        initial={current}
        regions={[]}
        breeds={[]}
        onApply={(v) => {
          const next = new URLSearchParams(params);
          v.wineType ? next.set('type', v.wineType) : next.delete('type');
          v.region ? next.set('region', v.region) : next.delete('region');
          v.breed ? next.set('breed', v.breed) : next.delete('breed');
          v.sort ? next.set('sort', v.sort) : next.delete('sort');
          setOpen(false);
          navigate(`/search?${next.toString()}`);
        }}
        onReset={() => {
          const next = new URLSearchParams(params);
          ['type', 'region', 'breed', 'sort'].forEach((k) => next.delete(k));
          setOpen(false);
          navigate(`/search?${next.toString()}`);
        }}
      />
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SearchBar } from '@/components/common/SearchBar';
import { CardWine, Wine } from '@/components/common/CardWine';
import FilterSheet, { FilterValues } from '@/components/search/FilterSheet';
import { api } from '@/lib/api';
import { trackWineSearch } from '@/lib/analytics';

const searchGuideSteps = [
  { title: '검색어 입력하기', description: '와인 이름·품종·지역을 입력하세요. 추천 목록에서 와인을 고르거나 엔터·검색 버튼으로 전체 결과를 볼 수 있어요.' },
  { title: '검색 필터 사용하기', description: '와인 타입, 원산지, 품종을 고르고 정렬 순서도 바꿀 수 있어요. 선택한 뒤 ‘필터 적용’을 누르세요.' },
  { title: '결과 확인하기', description: '와인을 누르면 상세와 리뷰를 볼 수 있어요. 검색 결과가 없다면 ‘새로운 와인 등록하기’ 버튼으로 직접 등록할 수 있어요.' },
];

export function SearchListMobile() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [guideStep, setGuideStep] = useState<number | null>(null);
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const lastTrackedSearchRef = useRef('');
  const guideCloseRef = useRef<HTMLButtonElement>(null);
  const firstResultRef = useRef<HTMLDivElement>(null);

  const [regions, setRegions] = useState<string[]>([]);
  const [breeds, setBreeds] = useState<string[]>([]);

  useEffect(() => {
    if (guideStep === null) return;
    guideCloseRef.current?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setGuideStep(null);
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [guideStep]);

  useEffect(() => setGuideStep(null), [params.toString()]);

  useEffect(() => {
    if (guideStep === 2) firstResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [guideStep, loading, wines.length]);

  useEffect(() => {
    api.get('/wines/filters/').then(({ data }) => {
      setRegions(data.countries ?? []);
      setBreeds(data.breeds ?? []);
    }).catch(() => {});
  }, []);

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
    let active = true;
    setWines([]);
    setPage(1);
    setHasNext(false);
    setLoading(true);
    api.get(`/wines/?${buildQuery(1)}`)
      .then(({ data }) => {
        if (!active) return;
        const results: Wine[] = data.results ?? [];
        setWines(results);
        setHasNext(data.hasNext ?? false);
        setPage(1);
        if (q && lastTrackedSearchRef.current !== q && trackWineSearch(q, results)) {
          lastTrackedSearchRef.current = q;
        }
      })
      .catch(() => { if (active) setWines([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
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
      <div className={`sticky top-16 pt-2 pb-2 bg-white ${guideStep !== null && guideStep < 2 ? 'z-[70]' : 'z-30'}`}>
        <div className="mx-auto w-full max-w-mobile px-4 space-y-3">
          <div className={guideStep === 0 ? 'rounded-2xl ring-4 ring-accent ring-offset-2' : ''}>
            <SearchBar enableSuggestions />
          </div>
          <div className="flex gap-2">
            <button
              className={`min-w-0 flex-1 py-2 rounded-2xl border border-accent text-accent text-sm ${guideStep === 1 ? 'ring-4 ring-accent ring-offset-2' : ''}`}
              onClick={() => { setGuideStep(null); setOpen(true); }}
            >
              검색 필터
            </button>
            <button
              type="button"
              className="shrink-0 rounded-2xl border border-border px-3 py-2 text-sm text-muted"
              onClick={() => setGuideStep(0)}
              aria-label="검색 화면 사용법 열기"
            >
              ? 사용법
            </button>
          </div>
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
            <div ref={firstResultRef} className={`card p-6 text-center ${guideStep === 2 ? 'relative z-[70] ring-4 ring-accent ring-offset-2' : ''}`}>
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
        {wines.map((w, index) => (
          <div key={w.id} ref={index === 0 ? firstResultRef : undefined} className={`mx-auto w-full max-w-mobile px-4 ${guideStep === 2 && index === 0 ? 'relative z-[70] rounded-2xl ring-4 ring-accent ring-offset-2' : ''}`}>
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
        regions={regions}
        breeds={breeds}
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

      {guideStep !== null && (
        <>
          <button type="button" className="fixed inset-0 z-[60] h-full w-full bg-black/55" aria-label="사용법 닫기" onClick={() => setGuideStep(null)} />
          <div className="fixed inset-x-0 bottom-0 z-[80] mx-auto w-full max-w-mobile rounded-t-3xl bg-white px-5 pb-8 pt-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="search-guide-title">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-accent">검색 사용법 {guideStep + 1} / {searchGuideSteps.length}</span>
              <button ref={guideCloseRef} type="button" className="rounded-full px-2 py-1 text-sm text-muted" onClick={() => setGuideStep(null)}>닫기</button>
            </div>
            <h2 id="search-guide-title" className="text-lg font-semibold">{searchGuideSteps[guideStep].title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{searchGuideSteps[guideStep].description}</p>
            <div className="mt-5 flex gap-2">
              {guideStep > 0 && <button type="button" className="rounded-xl border border-border px-4 py-2.5 text-sm" onClick={() => setGuideStep(guideStep - 1)}>이전</button>}
              <button type="button" className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white" onClick={() => setGuideStep(guideStep === searchGuideSteps.length - 1 ? null : guideStep + 1)}>
                {guideStep === searchGuideSteps.length - 1 ? '완료' : '다음'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

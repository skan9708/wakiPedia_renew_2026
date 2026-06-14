import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SearchBar } from '@/components/common/SearchBar';
import { CardWine, Wine } from '@/components/common/CardWine';
import FilterSheet, { FilterValues } from '@/components/search/FilterSheet';
import { api } from '@/lib/api';

export function SearchListMobile() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(false);

  const q = params.get('q') ?? '';
  const current: FilterValues = {
    wineType: (params.get('type') as FilterValues['wineType']) ?? undefined,
    region: params.get('region') ?? undefined,
    breed: params.get('breed') ?? undefined,
    sort: (params.get('sort') as FilterValues['sort']) ?? undefined,
  };

  useEffect(() => {
    setLoading(true);
    const searchParams = new URLSearchParams();
    if (q) searchParams.set('q', q);
    if (current.wineType) searchParams.set('type', current.wineType);
    if (current.region) searchParams.set('country', current.region);
    if (current.breed) searchParams.set('breed', current.breed);
    if (current.sort) searchParams.set('sort', current.sort);

    api.get(`/wines/?${searchParams.toString()}`)
      .then(({ data }) => setWines(data))
      .catch(() => setWines([]))
      .finally(() => setLoading(false));
  }, [params.toString()]);

  return (
    <div className="space-y-2">
      <div className="sticky top-16 z-30 pt-2 pb-2 bg-white">
        <div className="mx-auto w-full max-w-mobile px-4 space-y-3">
          <SearchBar />
          <button className="w-full py-2 rounded-2xl border border-accent text-accent text-sm" onClick={() => setOpen(true)}>검색 필터</button>
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
          <CardWine
            key={w.id}
            wine={w}
            onClick={() => navigate(`/wines/${w.id}`)}
          />
        ))}
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

import { useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SearchBar } from '@/components/common/SearchBar';
import { CardWine, Wine } from '@/components/common/CardWine';
import FilterSheet, { FilterValues } from '@/components/search/FilterSheet';

const autoList: Wine[] = Array.from({ length: 8 }).map((_, i) => ({
  id: String(i),
  nameKr: `와인 ${i + 1}`,
  nameEng: `Wine ${i + 1}`,
  wineType: ['Red','White','Rose','Sparkling'][i % 4] as Wine['wineType'],
  regions: ['France','Italy','USA','Spain'][i % 4],
  ratingAverage: (Math.random() * 2 + 3).toFixed(1) as unknown as number,
}));

// 지정 더미: 샤또몽페라
const dummy: Wine[] = [
  {
    id: 'montperat',
    nameKr: '샤또몽페라',
    nameEng: 'Chateau Mont-Perat',
    wineType: 'Red',
    regions: 'France',
    breed: 'Merlot, Cabernet Franc',
    tags: ['프랑스', '메를로', '까베르네프랑'],
    ratingAverage: 4.2,
    imageUrl: 'https://plus.unsplash.com/premium_photo-1682097091093-dd18b37764a5?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
  },
  ...autoList,
];
 
export function SearchListMobile() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const q = params.get('q')?.toLowerCase().trim() ?? '';
  const current: FilterValues = {
    wineType: (params.get('type') as FilterValues['wineType']) ?? undefined,
    region: params.get('region') ?? undefined,
    breed: params.get('breed') ?? undefined,
    sort: (params.get('sort') as FilterValues['sort']) ?? undefined,
  };

  const allRegions = useMemo(
    () => Array.from(new Set(dummy.map((d) => d.regions).filter((r): r is string => !!r))),
    []
  );

  const list = useMemo(() => {
    let base = q ? dummy.filter((w) => w.nameKr.includes(q) || w.nameEng.toLowerCase().includes(q)) : dummy;
    if (current.wineType) base = base.filter((w) => w.wineType === current.wineType);
    if (current.region) base = base.filter((w) => w.regions === current.region);
    if (current.breed) base = base.filter((w) => w.nameEng.includes(current.breed as string));
    if (current.sort === 'rating_desc') base = [...base].sort((a,b) => (Number(b.ratingAverage ?? 0) - Number(a.ratingAverage ?? 0)));
    if (current.sort === 'rating_asc') base = [...base].sort((a,b) => (Number(a.ratingAverage ?? 0) - Number(b.ratingAverage ?? 0)));
    return base;
  }, [q, params.toString()]);

  return (
    <div className="space-y-2">
      <div className="sticky top-16 z-30 pt-2 pb-2 bg-white">
        <div className="mx-auto w-full max-w-mobile px-4 space-y-3">
          <SearchBar />
          <button className="w-full py-3 rounded-2xl bg-accent text-white"  onClick={() => setOpen(true)}>검색 필터</button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-10 mt-0">
        {list.length === 0 && (
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
        {list.map((w) => (
          <CardWine
            key={w.id}
            wine={{
              ...w,
              imageUrl:
                w.imageUrl ??
                'https://plus.unsplash.com/premium_photo-1682097091093-dd18b37764a5?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
            }}
            onClick={() => navigate(`/wines/${w.id}`)}
          />
        ))}
      </div>
      <FilterSheet
        open={open}
        onClose={() => setOpen(false)}
        initial={current}
        regions={allRegions}
        breeds={[...new Set(['Cabernet','Merlot','Chardonnay','Pinot Noir'])]}
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
          ['type','region','breed','sort'].forEach((k) => next.delete(k));
          setOpen(false);
          navigate(`/search?${next.toString()}`);
        }}
      />
    </div>
  );
}



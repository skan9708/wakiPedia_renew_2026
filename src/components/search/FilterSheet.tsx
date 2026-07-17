import { useEffect, useState } from 'react';

export type FilterValues = {
  wineType?: 'Red' | 'White' | 'Rose' | 'Sparkling';
  region?: string;
  breed?: string;
  sort?: 'rating_desc' | 'rating_asc';
};

type Props = {
  open: boolean;
  onClose: () => void;
  initial: FilterValues;
  regions: string[];
  breeds: string[];
  onApply: (values: FilterValues) => void;
  onReset: () => void;
};

export function FilterSheet({ open, onClose, initial, regions, breeds, onApply, onReset }: Props) {
  const [values, setValues] = useState<FilterValues>(initial);

  useEffect(() => {
    setValues(initial);
  }, [initial, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute inset-x-0 rounded-t-2xl bg-white p-4 shadow-xl mx-auto w-full max-w-mobile"
        style={{ bottom: '57px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1 w-10 bg-neutral-200 rounded mx-auto mb-3" />
        <h3 className="text-base font-semibold mb-3">검색 필터</h3>

        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">와인 타입</div>
            <div className="grid grid-cols-4 gap-2">
              {(['Red','White','Rose','Sparkling'] as const).map((t) => (
                <button
                  key={t}
                  className={`px-2 py-1.5 rounded-full text-xs border ${values.wineType===t? 'bg-accent text-white border-accent':'border-border'}`}
                  onClick={() => setValues((v) => ({ ...v, wineType: v.wineType===t? undefined : t }))}
                  aria-pressed={values.wineType===t}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">원산지</div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border whitespace-nowrap ${!values.region ? 'bg-accent text-white border-accent' : 'border-border'}`}
                onClick={() => setValues((v) => ({ ...v, region: undefined }))}
              >전체</button>
              {regions.map((r) => (
                <button
                  key={r}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs border whitespace-nowrap ${values.region === r ? 'bg-accent text-white border-accent' : 'border-border'}`}
                  onClick={() => setValues((v) => ({ ...v, region: v.region === r ? undefined : r }))}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">품종</div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <button
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs border whitespace-nowrap ${!values.breed ? 'bg-accent text-white border-accent' : 'border-border'}`}
                onClick={() => setValues((v) => ({ ...v, breed: undefined }))}
              >전체</button>
              {breeds.map((b) => (
                <button
                  key={b}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs border whitespace-nowrap ${values.breed === b ? 'bg-accent text-white border-accent' : 'border-border'}`}
                  onClick={() => setValues((v) => ({ ...v, breed: v.breed === b ? undefined : b }))}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">정렬</div>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'rating_desc', label: '별점 높은순' },
                { key: 'rating_asc', label: '별점 낮은순' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  className={`px-2 py-2 rounded-lg text-sm border ${values.sort===key? 'bg-accent text-white border-accent':'border-border'}`}
                  onClick={() => setValues((v) => ({ ...v, sort: key as FilterValues['sort'] }))}
                  aria-pressed={values.sort===key}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4 pt-3 border-t border-border">
          <button className="flex-1 py-3 rounded-2xl border border-border" onClick={onReset}>초기화</button>
          <button className="flex-1 py-3 rounded-2xl bg-accent text-white" onClick={() => onApply(values)}>필터 적용</button>
        </div>
      </div>
    </div>
  );
}

export default FilterSheet;



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
            <select
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white"
              value={values.region ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, region: e.target.value || undefined }))}
            >
              <option value="">전체</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">품종</div>
            <select
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-white"
              value={values.breed ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, breed: e.target.value || undefined }))}
            >
              <option value="">전체</option>
              {breeds.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
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



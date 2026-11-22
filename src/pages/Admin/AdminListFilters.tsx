import { useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';

export type FilterOption = { value: string; label: string };
export type ColumnFilter = {
  label: string;
  key?: string;
  kind?: 'text' | 'number' | 'select' | 'date';
  options?: FilterOption[];
  placeholder?: string;
};

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function ColumnFilterRow({
  columns, values, onChange,
}: {
  columns: ColumnFilter[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  return (
    <tr className="border-t border-gray-200 bg-white">
      {columns.map((column, index) => {
        const label = `${column.label} 필터`;
        if (!column.key) return <th key={index} className="px-2 py-2" />;
        if (column.kind === 'date') {
          return <th key={column.key} className="min-w-44 px-2 py-2">
            <div className="flex flex-col gap-1">
              <input type="date" aria-label={`${column.label} 시작`} value={values.date_from ?? ''} onChange={e => onChange('date_from', e.target.value)} className="w-full rounded border border-gray-200 px-1 py-1 text-xs font-normal" />
              <input type="date" aria-label={`${column.label} 끝`} value={values.date_to ?? ''} onChange={e => onChange('date_to', e.target.value)} className="w-full rounded border border-gray-200 px-1 py-1 text-xs font-normal" />
            </div>
          </th>;
        }
        if (column.kind === 'select') {
          return <th key={column.key} className="min-w-28 px-2 py-2">
            <select aria-label={label} value={values[column.key] ?? ''} onChange={e => onChange(column.key!, e.target.value)} className="w-full rounded border border-gray-200 bg-white px-1 py-1.5 text-xs font-normal">
              <option value="">전체</option>
              {column.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </th>;
        }
        return <th key={column.key} className="min-w-24 px-2 py-2">
          <input
            type={column.kind === 'number' ? 'number' : 'search'}
            min={column.kind === 'number' ? 0 : undefined}
            aria-label={label}
            value={values[column.key] ?? ''}
            onChange={e => onChange(column.key!, e.target.value)}
            placeholder={column.placeholder ?? '찾기'}
            className="w-full rounded border border-gray-200 px-2 py-1.5 text-xs font-normal outline-none focus:border-[#c84b31]"
          />
        </th>;
      })}
    </tr>
  );
}

export async function downloadAdminExcel(path: string, params: Record<string, string | number>, filename: string) {
  const { data } = await api.get<Blob>(path, {
    params: { ...params, export: 'xlsx' }, responseType: 'blob', timeout: 60000,
  });
  const url = window.URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export function SortHeader({
  label, sort, asc, desc, onSort, className = '',
}: {
  label: ReactNode;
  sort: string;
  asc: string;
  desc: string;
  onSort: (sort: string) => void;
  className?: string;
}) {
  const active = sort === asc || sort === desc;
  return (
    <th className={`whitespace-nowrap text-left px-4 py-3 ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sort === desc ? asc : desc)}
        aria-label={`${label} 정렬`}
        aria-pressed={active}
        className={`inline-flex items-center gap-1 hover:text-[#c84b31] ${active ? 'text-[#c84b31]' : ''}`}
      >
        {label}<span aria-hidden="true">{sort === asc ? '↑' : sort === desc ? '↓' : '↕'}</span>
      </button>
    </th>
  );
}

export function DateRangeFields({
  from, to, onFrom, onTo, label,
}: {
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
      <span className="font-medium">{label}</span>
      <input type="date" aria-label={`${label} 시작`} value={from} onChange={e => onFrom(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5" />
      <span>~</span>
      <input type="date" aria-label={`${label} 끝`} value={to} onChange={e => onTo(e.target.value)} className="rounded-lg border border-gray-200 bg-white px-2 py-1.5" />
    </div>
  );
}

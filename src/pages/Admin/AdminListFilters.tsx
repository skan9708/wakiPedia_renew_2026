import type { ReactNode } from 'react';

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

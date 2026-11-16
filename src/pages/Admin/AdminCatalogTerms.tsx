import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

type PendingTerm = {
  kind: 'country' | 'grape';
  id: number;
  name: string;
  wineCount: number;
  createdAt: string;
};

export function AdminCatalogTerms() {
  const [items, setItems] = useState<PendingTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get<{ results: PendingTerm[] }>('/admin/catalog-terms/');
      setItems(data.results);
      setError('');
    } catch {
      setError('승인 대기 항목을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const decide = async (item: PendingTerm, approved: boolean) => {
    if (!approved && !window.confirm(
      `‘${item.name}’을(를) 반려할까요? 연결된 와인 ${item.wineCount}개의 해당 정보가 제거됩니다.`,
    )) return;
    setBusy(`${item.kind}-${item.id}`);
    try {
      await api.patch(`/admin/catalog-terms/${item.kind}/${item.id}/`, { approved });
      await load();
      window.dispatchEvent(new Event('catalog-terms-updated'));
    } catch {
      setError('처리하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">원산지·품종 승인</h1>
      <p className="mt-2 text-sm text-gray-500">사용자가 직접 입력한 항목입니다. 승인하면 와인 등록과 검색 필터의 선택 목록에 추가됩니다.</p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {loading ? <p className="mt-8 text-gray-500">불러오는 중...</p> : items.length === 0 ? (
        <div className="mt-8 rounded-xl bg-white p-8 text-center text-gray-500">승인 대기 항목이 없습니다.</div>
      ) : (
        <div className="mt-6 space-y-3">
          {items.map((item) => (
            <div key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
              <span className="rounded-full bg-[#a6b718]/10 px-3 py-1 text-xs text-[#788915]">
                {item.kind === 'country' ? '원산지' : '품종'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-xs text-gray-500">연결된 와인 {item.wineCount}개 · {item.createdAt.slice(0, 10)} 등록</p>
              </div>
              <button type="button" disabled={busy !== ''} onClick={() => void decide(item, false)}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-50">반려</button>
              <button type="button" disabled={busy !== ''} onClick={() => void decide(item, true)}
                className="rounded-lg bg-[#a6b718] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">승인</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

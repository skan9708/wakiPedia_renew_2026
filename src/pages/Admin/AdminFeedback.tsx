import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

type Feedback = {
  id: number;
  category: 'bug' | 'idea' | 'other';
  message: string;
  email: string;
  status: 'new' | 'handled';
  createdAt: string;
  handledAt: string | null;
};

const categories: Record<Feedback['category'], string> = {
  bug: '불편한 점',
  idea: '원하는 기능',
  other: '기타 의견',
};

export function AdminFeedback() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/admin/feedback/', { params: { page, category, status } });
      setItems(data.results);
      setTotal(data.total);
    } catch {
      setError('피드백을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [page, category, status]);

  useEffect(() => { void load(); }, [load]);

  const setHandled = async (item: Feedback) => {
    setBusyId(item.id);
    setError('');
    try {
      await api.patch(`/admin/feedback/${item.id}/`, { status: item.status === 'new' ? 'handled' : 'new' });
      await load();
    } catch {
      setError('상태를 변경하지 못했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (item: Feedback) => {
    if (!window.confirm(`피드백 #${item.id}을(를) 삭제할까요?`)) return;
    setBusyId(item.id);
    setError('');
    try {
      await api.delete(`/admin/feedback/${item.id}/`);
      await load();
    } catch {
      setError('삭제하지 못했습니다.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-5 flex items-baseline gap-2">
        <h1 className="text-lg font-bold">피드백 관리</h1>
        <span className="text-sm text-gray-400">총 {total}개</span>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} aria-label="의견 유형" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
          <option value="">전체 유형</option>
          <option value="bug">불편한 점</option>
          <option value="idea">원하는 기능</option>
          <option value="other">기타 의견</option>
        </select>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} aria-label="처리 상태" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
          <option value="">전체 상태</option>
          <option value="new">새 피드백</option>
          <option value="handled">확인 완료</option>
        </select>
      </div>
      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {loading ? <p className="py-10 text-center text-sm text-gray-400">불러오는 중...</p> : items.length === 0 ? (
        <p className="rounded-xl bg-white py-10 text-center text-sm text-gray-400">접수된 피드백이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-orange-50 px-2 py-1 text-[#c84b31]">{categories[item.category]}</span>
                <span className={item.status === 'new' ? 'font-semibold text-blue-600' : 'text-gray-500'}>{item.status === 'new' ? '새 피드백' : '확인 완료'}</span>
                <span>#{item.id}</span>
                <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString('ko-KR')}</time>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm text-gray-800">{item.message}</p>
              {item.email && <p className="mt-3 text-xs text-gray-500">답변용 이메일: <a href={`mailto:${item.email}`} className="text-blue-600 underline">{item.email}</a></p>}
              <div className="mt-4 flex gap-3 border-t border-gray-100 pt-3 text-xs">
                <button type="button" disabled={busyId === item.id} onClick={() => void setHandled(item)} className="text-[#c84b31] disabled:opacity-50">{item.status === 'new' ? '확인 완료로 표시' : '새 피드백으로 되돌리기'}</button>
                <button type="button" disabled={busyId === item.id} onClick={() => void remove(item)} className="text-red-500 disabled:opacity-50">삭제</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {(page > 1 || page * 20 < total) && (
        <div className="mt-5 flex justify-center items-center gap-3 text-sm">
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">이전</button>
          <span>{page} / {Math.ceil(total / 20)}</span>
          <button type="button" disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">다음</button>
        </div>
      )}
    </div>
  );
}

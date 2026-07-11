import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

type Wine = {
  id: number;
  korName: string;
  engName: string;
  type: string;
  country: string;
  imageUrl: string;
  bubbleAvgRating: number | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  red: '레드', white: '화이트', sparkling: '스파클링', rose: '로제', '': '미분류',
};

const EMPTY_FORM = { korName: '', engName: '', type: '', country: '', imageUrl: '', bubbleAvgRating: '' };

function WineModal({
  wine,
  onClose,
  onSaved,
}: {
  wine: Wine | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(
    wine
      ? {
          korName: wine.korName,
          engName: wine.engName,
          type: wine.type,
          country: wine.country,
          imageUrl: wine.imageUrl,
          bubbleAvgRating: wine.bubbleAvgRating != null ? String(wine.bubbleAvgRating) : '',
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    setErr('');
    try {
      const payload = {
        ...form,
        bubbleAvgRating: form.bubbleAvgRating !== '' ? parseFloat(form.bubbleAvgRating) : null,
      };
      if (wine) {
        await api.put(`/admin/wines/${wine.id}/`, payload);
      } else {
        await api.post('/admin/wines/', payload);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setErr(e.response?.data?.detail || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-base font-semibold mb-4">{wine ? '와인 수정' : '와인 등록'}</h2>
        {err && <p className="text-red-500 text-sm mb-3">{err}</p>}
        <div className="space-y-3">
          {([
            ['korName', '한글명 *'],
            ['engName', '영문명 *'],
            ['country', '국가'],
            ['imageUrl', '이미지 URL'],
            ['bubbleAvgRating', '기준 평균 평점 (0~5)'],
          ] as [string, string][]).map(([key, label]) => (
            <div key={key}>
              <label className="text-xs text-gray-500 block mb-1">{label}</label>
              <input
                value={(form as any)[key]}
                onChange={(e) => set(key, e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c84b31]"
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 block mb-1">타입</label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c84b31]"
            >
              <option value="">미분류</option>
              <option value="red">레드</option>
              <option value="white">화이트</option>
              <option value="sparkling">스파클링</option>
              <option value="rose">로제</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">취소</button>
          <button onClick={onSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[#c84b31] text-white disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminWines() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editWine, setEditWine] = useState<Wine | null>(null);
  const [delId, setDelId] = useState<number | null>(null);

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (q) params.q = q;
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get('/admin/wines/', { params });
      setWines(data.results);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, q, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(qInput);
    setPage(1);
  };

  const onDelete = async (id: number) => {
    await api.delete(`/admin/wines/${id}/`);
    setDelId(null);
    load();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">와인 관리 <span className="text-sm text-gray-400 font-normal">총 {total}개</span></h1>
        <button
          onClick={() => { setEditWine(null); setShowModal(true); }}
          className="bg-[#c84b31] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#b03e28]"
        >
          + 와인 등록
        </button>
      </div>

      {/* Search / Filter */}
      <div className="flex gap-2 mb-4">
        <form onSubmit={onSearch} className="flex gap-2 flex-1">
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="와인명 검색..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#c84b31]"
          />
          <button type="submit" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50">검색</button>
        </form>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none"
        >
          <option value="">전체 타입</option>
          <option value="red">레드</option>
          <option value="white">화이트</option>
          <option value="sparkling">스파클링</option>
          <option value="rose">로제</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-left px-4 py-3 w-10">ID</th>
              <th className="text-left px-4 py-3">한글명</th>
              <th className="text-left px-4 py-3">영문명</th>
              <th className="text-left px-4 py-3 w-20">타입</th>
              <th className="text-left px-4 py-3 w-24">국가</th>
              <th className="text-left px-4 py-3 w-20">평점</th>
              <th className="text-left px-4 py-3 w-28">등록일</th>
              <th className="text-left px-4 py-3 w-20">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">불러오는 중...</td></tr>
            ) : wines.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">데이터 없음</td></tr>
            ) : wines.map((w) => (
              <tr key={w.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-400">{w.id}</td>
                <td className="px-4 py-3 font-medium max-w-[160px]">
                  <div className="truncate">{w.korName}</div>
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[180px]">
                  <div className="truncate">{w.engName}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    w.type === 'red' ? 'bg-red-50 text-red-600' :
                    w.type === 'white' ? 'bg-yellow-50 text-yellow-700' :
                    w.type === 'sparkling' ? 'bg-blue-50 text-blue-600' :
                    w.type === 'rose' ? 'bg-pink-50 text-pink-600' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {TYPE_LABELS[w.type] ?? w.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{w.country || '-'}</td>
                <td className="px-4 py-3 text-gray-500">{w.bubbleAvgRating != null ? `${w.bubbleAvgRating}` : '-'}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{w.createdAt.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditWine(w); setShowModal(true); }} className="text-xs text-blue-500 hover:underline">수정</button>
                    <button onClick={() => setDelId(w.id)} className="text-xs text-red-400 hover:underline">삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">이전</button>
          <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">다음</button>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <WineModal
          wine={editWine}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}

      {delId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <p className="text-sm mb-4">정말 이 와인을 삭제하시겠습니까? 연관된 리뷰도 모두 삭제됩니다.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDelId(null)} className="px-4 py-2 text-sm border rounded-lg">취소</button>
              <button onClick={() => onDelete(delId)} className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg">삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

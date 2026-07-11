import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

type Tag = { id: number; name: string; category: string };

const CATEGORIES = [
  { value: 'fruity', label: '과일 (Fruity)', color: 'bg-orange-50 text-orange-600' },
  { value: 'floral', label: '꽃 (Floral)', color: 'bg-pink-50 text-pink-600' },
  { value: 'oaky', label: '오크 (Oaky)', color: 'bg-amber-50 text-amber-700' },
  { value: 'vegetal', label: '식물 (Vegetal)', color: 'bg-green-50 text-green-600' },
];

const CAT_COLOR: Record<string, string> = {
  fruity: 'bg-orange-50 text-orange-600',
  floral: 'bg-pink-50 text-pink-600',
  oaky: 'bg-amber-50 text-amber-700',
  vegetal: 'bg-green-50 text-green-600',
};

function TagModal({
  tag,
  onClose,
  onSaved,
}: {
  tag: Tag | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(tag?.name ?? '');
  const [category, setCategory] = useState(tag?.category ?? 'fruity');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const onSave = async () => {
    setSaving(true);
    setErr('');
    try {
      if (tag) {
        await api.put(`/admin/tags/${tag.id}/`, { name, category });
      } else {
        await api.post('/admin/tags/', { name, category });
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <h2 className="text-base font-semibold mb-4">{tag ? '태그 수정' : '태그 등록'}</h2>
        {err && <p className="text-red-500 text-sm mb-3">{err}</p>}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">태그명 *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c84b31]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">카테고리</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`py-2 px-3 rounded-lg text-sm border transition-colors ${
                    category === c.value
                      ? 'border-[#c84b31] bg-[#c84b31]/5 text-[#c84b31] font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
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

export function AdminTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [catFilter, setCatFilter] = useState('');
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTag, setEditTag] = useState<Tag | null>(null);
  const [delId, setDelId] = useState<number | null>(null);

  const limit = 100;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (catFilter) params.category = catFilter;
      if (q) params.q = q;
      const { data } = await api.get('/admin/tags/', { params });
      setTags(data.results);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, catFilter, q]);

  useEffect(() => { load(); }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(qInput);
    setPage(1);
  };

  const onDelete = async (id: number) => {
    await api.delete(`/admin/tags/${id}/`);
    setDelId(null);
    load();
  };

  const grouped = CATEGORIES.map((c) => ({
    ...c,
    items: tags.filter((t) => t.category === c.value),
  }));

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">태그 관리 <span className="text-sm text-gray-400 font-normal">총 {total}개</span></h1>
        <button
          onClick={() => { setEditTag(null); setShowModal(true); }}
          className="bg-[#c84b31] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#b03e28]"
        >
          + 태그 등록
        </button>
      </div>

      {/* Search / Filter */}
      <div className="flex gap-2 mb-4">
        <form onSubmit={onSearch} className="flex gap-2 flex-1">
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="태그명 검색..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#c84b31]"
          />
          <button type="submit" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50">검색</button>
        </form>
        <select
          value={catFilter}
          onChange={(e) => { setCatFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none"
        >
          <option value="">전체 카테고리</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">불러오는 중...</div>
      ) : catFilter || q ? (
        // Flat list when filtered
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-3 w-10">ID</th>
                <th className="text-left px-4 py-3">태그명</th>
                <th className="text-left px-4 py-3 w-36">카테고리</th>
                <th className="text-left px-4 py-3 w-20">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {tags.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-10 text-gray-400">데이터 없음</td></tr>
              ) : tags.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-400">{t.id}</td>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${CAT_COLOR[t.category] ?? 'bg-gray-100 text-gray-500'}`}>
                      {CATEGORIES.find((c) => c.value === t.category)?.label ?? t.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditTag(t); setShowModal(true); }} className="text-xs text-blue-500 hover:underline">수정</button>
                      <button onClick={() => setDelId(t.id)} className="text-xs text-red-400 hover:underline">삭제</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        // Grouped view by category
        <div className="space-y-4">
          {grouped.map((g) => (
            <div key={g.value} className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${g.color}`}>{g.label}</span>
                <span className="text-xs text-gray-400">{g.items.length}개</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {g.items.map((t) => (
                  <div key={t.id} className="flex items-center gap-1 border border-gray-200 rounded-full px-3 py-1">
                    <span className="text-sm">{t.name}</span>
                    <button onClick={() => { setEditTag(t); setShowModal(true); }} className="text-gray-300 hover:text-blue-400 text-xs ml-0.5">✏</button>
                    <button onClick={() => setDelId(t.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                  </div>
                ))}
                {g.items.length === 0 && (
                  <span className="text-xs text-gray-300">태그 없음</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">이전</button>
          <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">다음</button>
        </div>
      )}

      {showModal && (
        <TagModal
          tag={editTag}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}

      {delId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <p className="text-sm mb-4">이 태그를 삭제하시겠습니까?</p>
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

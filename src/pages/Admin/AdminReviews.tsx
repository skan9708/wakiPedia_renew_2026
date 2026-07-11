import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

type Review = {
  id: number;
  wineId: number;
  wineKorName: string;
  userId: number;
  userNickname: string;
  rating: number;
  text: string;
  isPublic: boolean;
  likeCount: number;
  createdAt: string;
};

type WineOption = { id: number; korName: string; engName: string };
type UserOption = { id: number; nickname: string; email: string };

function SearchDropdown<T extends { id: number }>({
  query, onQueryChange, results, selected, onSelect, onClear,
  renderSelected, renderItem, placeholder,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  results: T[];
  selected: T | null;
  onSelect: (item: T) => void;
  onClear: () => void;
  renderSelected: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  placeholder: string;
}) {
  return selected ? (
    <div className="flex items-center justify-between border border-[#c84b31] rounded-lg px-3 py-2 bg-[#c84b31]/5">
      <span className="text-sm font-medium">{renderSelected(selected)}</span>
      <button onClick={onClear} className="text-xs text-gray-400 hover:text-red-400">✕</button>
    </div>
  ) : (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c84b31]"
      />
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-auto">
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0"
            >
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCreateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [wineQuery, setWineQuery] = useState('');
  const [wineResults, setWineResults] = useState<WineOption[]>([]);
  const [selectedWine, setSelectedWine] = useState<WineOption | null>(null);
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [text, setText] = useState('');
  const [rating, setRating] = useState('3.0');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const searchWine = async (q: string) => {
    if (!q.trim()) { setWineResults([]); return; }
    const { data } = await api.get('/admin/wines/', { params: { q, limit: 8 } });
    setWineResults(data.results);
  };

  const searchUser = async (q: string) => {
    if (!q.trim()) { setUserResults([]); return; }
    const { data } = await api.get('/admin/users/', { params: { q, limit: 8 } });
    setUserResults(data.results);
  };

  const onSave = async () => {
    if (!selectedWine) { setErr('와인을 선택해주세요.'); return; }
    if (!text.trim()) { setErr('내용을 입력해주세요.'); return; }
    setSaving(true); setErr('');
    try {
      await api.post('/admin/reviews/', {
        wineId: selectedWine.id,
        userId: selectedUser?.id ?? null,
        text,
        rating: parseFloat(rating),
        isPublic,
      });
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
        <h2 className="text-base font-semibold mb-4">리뷰 등록</h2>
        {err && <p className="text-red-500 text-sm mb-3">{err}</p>}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">와인 검색 *</label>
            <SearchDropdown<WineOption>
              query={wineQuery}
              onQueryChange={(v) => { setWineQuery(v); searchWine(v); }}
              results={wineResults}
              selected={selectedWine}
              onSelect={(w) => { setSelectedWine(w); setWineResults([]); }}
              onClear={() => { setSelectedWine(null); setWineQuery(''); setWineResults([]); }}
              renderSelected={(w) => w.korName}
              renderItem={(w) => (
                <>
                  <span className="font-medium">{w.korName}</span>
                  <span className="text-gray-400 text-xs ml-1">{w.engName}</span>
                </>
              )}
              placeholder="와인명 입력..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">작성자 (미입력 시 관리자)</label>
            <SearchDropdown<UserOption>
              query={userQuery}
              onQueryChange={(v) => { setUserQuery(v); searchUser(v); }}
              results={userResults}
              selected={selectedUser}
              onSelect={(u) => { setSelectedUser(u); setUserResults([]); }}
              onClear={() => { setSelectedUser(null); setUserQuery(''); setUserResults([]); }}
              renderSelected={(u) => `${u.nickname} (${u.email})`}
              renderItem={(u) => (
                <>
                  <span className="font-medium">{u.nickname}</span>
                  <span className="text-gray-400 text-xs ml-1">{u.email}</span>
                </>
              )}
              placeholder="닉네임 또는 이메일 검색..."
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">평점 (0~5)</label>
            <input
              type="number" step="0.5" min="0" max="5"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c84b31]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">리뷰 내용 *</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c84b31] resize-none"
              placeholder="리뷰 내용을 입력하세요..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-[#c84b31]" />
            공개
          </label>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">취소</button>
          <button onClick={onSave} disabled={saving} className="px-4 py-2 text-sm rounded-lg bg-[#c84b31] text-white disabled:opacity-50">
            {saving ? '저장 중...' : '등록'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({
  review, onClose, onSaved,
}: {
  review: Review; onClose: () => void; onSaved: () => void;
}) {
  const [text, setText] = useState(review.text);
  const [rating, setRating] = useState(String(review.rating));
  const [isPublic, setIsPublic] = useState(review.isPublic);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const onSave = async () => {
    setSaving(true); setErr('');
    try {
      await api.put(`/admin/reviews/${review.id}/`, {
        text, rating: parseFloat(rating), isPublic,
      });
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
        <h2 className="text-base font-semibold mb-1">리뷰 수정</h2>
        <p className="text-xs text-gray-400 mb-4">{review.wineKorName} · {review.userNickname}</p>
        {err && <p className="text-red-500 text-sm mb-3">{err}</p>}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">평점 (0~5)</label>
            <input
              type="number" step="0.5" min="0" max="5"
              value={rating} onChange={(e) => setRating(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c84b31]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">리뷰 내용</label>
            <textarea
              value={text} onChange={(e) => setText(e.target.value)}
              rows={5}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c84b31] resize-none"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="accent-[#c84b31]" />
            공개
          </label>
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

export function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<Review | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [delId, setDelId] = useState<number | null>(null);

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (q) params.q = q;
      const { data } = await api.get('/admin/reviews/', { params });
      setReviews(data.results);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => { load(); }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(qInput);
    setPage(1);
  };

  const onDelete = async (id: number) => {
    await api.delete(`/admin/reviews/${id}/`);
    setDelId(null);
    load();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">리뷰 관리 <span className="text-sm text-gray-400 font-normal">총 {total}개</span></h1>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-[#c84b31] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#b03e28]"
        >
          + 리뷰 등록
        </button>
      </div>

      <form onSubmit={onSearch} className="flex gap-2 mb-4">
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="와인명, 유저명, 내용 검색..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#c84b31]"
        />
        <button type="submit" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50">검색</button>
      </form>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-left px-4 py-3 w-10">ID</th>
              <th className="text-left px-4 py-3">와인</th>
              <th className="text-left px-4 py-3 w-24">작성자</th>
              <th className="text-left px-4 py-3 w-16">평점</th>
              <th className="text-left px-4 py-3">내용</th>
              <th className="text-left px-4 py-3 w-14">공개</th>
              <th className="text-left px-4 py-3 w-14">좋아요</th>
              <th className="text-left px-4 py-3 w-24">날짜</th>
              <th className="text-left px-4 py-3 w-20">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">불러오는 중...</td></tr>
            ) : reviews.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">데이터 없음</td></tr>
            ) : reviews.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-400">{r.id}</td>
                <td className="px-4 py-3 font-medium max-w-[160px]">
                  <div className="truncate">{r.wineKorName}</div>
                </td>
                <td className="px-4 py-3 text-gray-500">{r.userNickname}</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-[#c84b31]">★ {r.rating.toFixed(1)}</span>
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[220px]">
                  <div className="truncate text-xs">{r.text}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.isPublic ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {r.isPublic ? '공개' : '비공개'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.likeCount}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{r.createdAt.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => setModal(r)} className="text-xs text-blue-500 hover:underline">수정</button>
                    <button onClick={() => setDelId(r.id)} className="text-xs text-red-400 hover:underline">삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">이전</button>
          <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40">다음</button>
        </div>
      )}

      {showCreate && (
        <ReviewCreateModal onClose={() => setShowCreate(false)} onSaved={load} />
      )}

      {modal && (
        <ReviewModal review={modal} onClose={() => setModal(null)} onSaved={load} />
      )}

      {delId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <p className="text-sm mb-4">이 리뷰를 삭제하시겠습니까?</p>
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

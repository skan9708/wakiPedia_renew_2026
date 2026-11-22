import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { ColumnFilterRow, downloadAdminExcel, SortHeader, useDebouncedValue, type ColumnFilter } from './AdminListFilters';

type AdminUser = {
  id: number;
  email: string;
  nickname: string;
  isActive: boolean;
  isStaff: boolean;
  reviewCount: number;
  createdAt: string;
};

function UserModal({
  user,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = user === null;
  const [form, setForm] = useState({
    email: user?.email ?? '',
    nickname: user?.nickname ?? '',
    password: '',
    isActive: user?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const onSave = async () => {
    setSaving(true);
    setErr('');
    try {
      if (isNew) {
        await api.post('/admin/users/', {
          email: form.email,
          nickname: form.nickname,
          password: form.password,
        });
      } else {
        const payload: any = {
          nickname: form.nickname,
          isActive: form.isActive,
        };
        if (form.password) payload.password = form.password;
        await api.put(`/admin/users/${user!.id}/`, payload);
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-base font-semibold mb-4">{isNew ? '유저 등록' : '유저 수정'}</h2>
        {err && <p className="text-red-500 text-sm mb-3">{err}</p>}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">이메일 {isNew && '*'}</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              disabled={!isNew}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c84b31] disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">닉네임 *</label>
            <input
              value={form.nickname}
              onChange={(e) => set('nickname', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c84b31]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              {isNew ? '비밀번호 *' : '새 비밀번호 (변경 시만 입력)'}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c84b31]"
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
                className="accent-[#c84b31]"
              />
              활성 계정
            </label>
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

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const appliedFilters = useDebouncedValue(filters);
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [delId, setDelId] = useState<number | null>(null);
  const navigate = useNavigate();
  const requestId = useRef(0);

  const limit = 20;

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit, sort, ...appliedFilters };
      if (q) params.q = q;
      const { data } = await api.get('/admin/users/', { params });
      if (currentRequest === requestId.current) {
        setUsers(data.results);
        setTotal(data.total);
        setError('');
      }
    } catch {
      if (currentRequest === requestId.current) setError('유저 목록을 불러오지 못했습니다.');
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [page, q, appliedFilters, sort]);

  useEffect(() => { load(); }, [load]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQ(qInput);
    setPage(1);
  };

  const changeSort = (value: string) => { setSort(value); setPage(1); };
  const changeFilter = (key: string, value: string) => {
    setFilters(previous => ({ ...previous, [key]: value }));
    setPage(1);
  };
  const exportExcel = async () => {
    setExporting(true);
    try {
      await downloadAdminExcel('/admin/users/', { ...appliedFilters, sort, ...(q ? { q } : {}) }, '와키_유저목록.xlsx');
      setError('');
    } catch {
      setError('엑셀 파일을 내려받지 못했습니다. 다시 시도해 주세요.');
    } finally {
      setExporting(false);
    }
  };

  const filterColumns: ColumnFilter[] = [
    { label: 'ID', key: 'id', kind: 'number' },
    { label: '이메일', key: 'email' },
    { label: '닉네임', key: 'nickname' },
    { label: '리뷰 수', key: 'review_count', kind: 'number' },
    { label: '상태', key: 'status', kind: 'select', options: [{ value: 'active', label: '활성' }, { value: 'inactive', label: '비활성' }] },
    { label: '권한', key: 'role', kind: 'select', options: [{ value: 'staff', label: '관리자' }, { value: 'member', label: '일반 회원' }] },
    { label: '가입일', key: 'date_from', kind: 'date' },
    { label: '관리' },
  ];

  const onDelete = async (id: number) => {
    await api.delete(`/admin/users/${id}/`);
    setDelId(null);
    load();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold">유저 관리 <span className="text-sm text-gray-400 font-normal">총 {total}명</span></h1>
        <button
          onClick={() => { setEditUser(null); setShowModal(true); }}
          className="bg-[#c84b31] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#b03e28]"
        >
          + 유저 등록
        </button>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
      <form onSubmit={onSearch} className="flex flex-wrap gap-2">
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="이메일, 닉네임 검색..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#c84b31]"
        />
        <button type="submit" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50">검색</button>
        <button type="button" onClick={() => { setQ(''); setQInput(''); setFilters({}); setSort('newest'); setPage(1); }} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm">초기화</button>
        <button type="button" onClick={exportExcel} disabled={exporting} className="rounded-lg bg-[#a4b51c] px-3 py-1.5 text-sm text-white disabled:opacity-50">{exporting ? '내려받는 중...' : '엑셀 다운로드'}</button>
      </form>
      <p className="mt-2 text-xs text-gray-500">아래 열마다 조건을 고르거나 입력하면 함께 적용됩니다. 엑셀에는 조건에 맞는 전체 결과가 담깁니다.</p>
      </div>
      {error && <p role="alert" className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="whitespace-nowrap text-left px-4 py-3 w-10">ID</th>
              <th className="whitespace-nowrap text-left px-4 py-3">이메일</th>
              <th className="whitespace-nowrap text-left px-4 py-3 w-28">닉네임</th>
              <SortHeader label="리뷰 수" sort={sort} asc="reviews_asc" desc="reviews_desc" onSort={changeSort} className="w-20" />
              <th className="whitespace-nowrap text-left px-4 py-3 w-16">상태</th>
              <th className="whitespace-nowrap text-left px-4 py-3 w-16">권한</th>
              <SortHeader label="가입일" sort={sort} asc="oldest" desc="newest" onSort={changeSort} className="w-24" />
              <th className="whitespace-nowrap text-left px-4 py-3 w-20">관리</th>
            </tr>
            <ColumnFilterRow columns={filterColumns} values={filters} onChange={changeFilter} />
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">불러오는 중...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">데이터 없음</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} onClick={() => navigate(`/admin-panel/users/${u.id}`)} className="hover:bg-gray-50/50 cursor-pointer">
                <td className="px-4 py-3 text-gray-400">{u.id}</td>
                <td className="px-4 py-3 max-w-[200px]">
                  <div className="truncate">{u.email}</div>
                </td>
                <td className="px-4 py-3 font-medium">{u.nickname}</td>
                <td className="px-4 py-3 text-gray-500">{u.reviewCount}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${u.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-400'}`}>
                    {u.isActive ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.isStaff && (
                    <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-purple-50 text-purple-600">관리자</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{u.createdAt.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setEditUser(u); setShowModal(true); }} className="text-xs text-blue-500 hover:underline">수정</button>
                    <button onClick={() => setDelId(u.id)} className="text-xs text-red-400 hover:underline">삭제</button>
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

      {showModal && (
        <UserModal
          user={editUser}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}

      {delId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <p className="text-sm mb-4">이 유저를 삭제하시겠습니까? 작성한 리뷰도 모두 삭제됩니다.</p>
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

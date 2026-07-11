import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

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
    isStaff: user?.isStaff ?? false,
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
          isStaff: form.isStaff,
        });
      } else {
        const payload: any = {
          nickname: form.nickname,
          isActive: form.isActive,
          isStaff: form.isStaff,
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
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.isStaff}
                onChange={(e) => set('isStaff', e.target.checked)}
                className="accent-[#c84b31]"
              />
              관리자 권한
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
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [delId, setDelId] = useState<number | null>(null);

  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit };
      if (q) params.q = q;
      const { data } = await api.get('/admin/users/', { params });
      setUsers(data.results);
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

      <form onSubmit={onSearch} className="flex gap-2 mb-4">
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="이메일, 닉네임 검색..."
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#c84b31]"
        />
        <button type="submit" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50">검색</button>
      </form>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs">
            <tr>
              <th className="text-left px-4 py-3 w-10">ID</th>
              <th className="text-left px-4 py-3">이메일</th>
              <th className="text-left px-4 py-3 w-28">닉네임</th>
              <th className="text-left px-4 py-3 w-16">리뷰수</th>
              <th className="text-left px-4 py-3 w-16">상태</th>
              <th className="text-left px-4 py-3 w-16">권한</th>
              <th className="text-left px-4 py-3 w-24">가입일</th>
              <th className="text-left px-4 py-3 w-20">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">불러오는 중...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">데이터 없음</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-gray-400">{u.id}</td>
                <td className="px-4 py-3 max-w-[200px]">
                  <div className="truncate">{u.email}</div>
                </td>
                <td className="px-4 py-3 font-medium">{u.nickname}</td>
                <td className="px-4 py-3 text-gray-500">{u.reviewCount}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-400'}`}>
                    {u.isActive ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.isStaff && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">관리자</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{u.createdAt.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
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

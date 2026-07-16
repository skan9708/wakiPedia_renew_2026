import { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { AdminWines } from './AdminWines';
import { AdminReviews } from './AdminReviews';
import { AdminUsers } from './AdminUsers';
import { AdminTags } from './AdminTags';
import { api } from '@/lib/api';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, logout, user } = useAuthStore();
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !pw.trim()) { setErr('이메일과 비밀번호를 입력해주세요.'); return; }
    setErr('');
    setLoading(true);
    logout();
    try {
      const { data } = await api.post('/auth/login/', { email: email.trim(), password: pw });
      if (!data.user?.isStaff) {
        setErr('관리자 권한이 없는 계정입니다.');
        setLoading(false);
        return;
      }
      login(data.access, data.user);
      navigate('/admin-panel/wines');
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.response?.status;
      setErr(`로그인 실패 (${msg ?? '서버 오류'})`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-center mb-1">Wakipedia 관리자</h1>
        <p className="text-xs text-gray-400 text-center mb-6">관리자 계정으로만 접근 가능합니다</p>

        {user && !user.isStaff && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
            현재 <span className="font-semibold">{user.nickname}</span> 계정으로 로그인되어 있습니다.
            관리자 계정으로 입력하면 자동 전환됩니다.
          </div>
        )}

        {err && <p className="text-red-500 text-sm mb-4 text-center bg-red-50 py-2 px-3 rounded-lg">{err}</p>}

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="관리자 이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c84b31]"
          />
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="비밀번호"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:border-[#c84b31]"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <EyeIcon open={showPw} />
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#c84b31] text-white rounded-lg py-2 font-medium disabled:opacity-60"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { to: '/admin-panel/wines', label: '와인 관리', icon: '🍷' },
  { to: '/admin-panel/reviews', label: '리뷰 관리', icon: '📝' },
  { to: '/admin-panel/users', label: '유저 관리', icon: '👤' },
  { to: '/admin-panel/tags', label: '태그 관리', icon: '🏷️' },
];

function AdminLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!user || !user.isStaff) {
    return <Navigate to="/admin-panel/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-56 bg-white shadow-sm flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="text-base font-bold text-[#c84b31]">Wakipedia</div>
          <div className="text-xs text-gray-400 mt-0.5">관리자 패널</div>
        </div>
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-[#c84b31]/10 text-[#c84b31] font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <span>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 mb-2 truncate">{user.email || user.nickname}</div>
          <button
            onClick={() => { logout(); navigate('/admin-panel/login'); }}
            className="text-xs text-gray-400 hover:text-red-500"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="wines" element={<AdminWines />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="tags" element={<AdminTags />} />
          <Route path="*" element={<Navigate to="/admin-panel/wines" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export function AdminApp() {
  const { user } = useAuthStore();

  return (
    <Routes>
      <Route path="login" element={
        user?.isStaff
          ? <Navigate to="/admin-panel/wines" replace />
          : <AdminLogin />
      } />
      <Route path="*" element={<AdminLayout />} />
    </Routes>
  );
}

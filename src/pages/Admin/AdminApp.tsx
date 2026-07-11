import { useState } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import { AdminWines } from './AdminWines';
import { AdminReviews } from './AdminReviews';
import { AdminUsers } from './AdminUsers';
import { AdminTags } from './AdminTags';
import { api } from '@/lib/api';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      const { data } = await api.post('/auth/login/', { email, password: pw });
      if (!data.user?.isStaff) {
        setErr('관리자 계정이 아닙니다.');
        return;
      }
      login(data.access, data.user);
      navigate('/admin-panel/wines');
    } catch {
      setErr('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-center mb-6">Wakipedia 관리자</h1>
        {err && <p className="text-red-500 text-sm mb-4 text-center">{err}</p>}
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c84b31]"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#c84b31]"
          />
          <button type="submit" className="w-full bg-[#c84b31] text-white rounded-lg py-2 font-medium">
            로그인
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

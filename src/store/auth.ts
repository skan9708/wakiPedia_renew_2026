import { create } from 'zustand';

type User = { id: string; nickname: string; email: string; avatarUrl?: string; isStaff?: boolean } | null;

type AuthState = {
  token: string | null;
  user: User;
  login: (token: string, user: NonNullable<User>) => void;
  logout: () => void;
};

const stored = (() => {
  try {
    const token = localStorage.getItem('waki_token');
    const user = localStorage.getItem('waki_user');
    return { token, user: user ? JSON.parse(user) : null };
  } catch {
    return { token: null, user: null };
  }
})();

export const useAuthStore = create<AuthState>((set) => ({
  token: stored.token,
  user: stored.user,
  login: (token, user) => {
    try {
      localStorage.setItem('waki_token', token);
      localStorage.setItem('waki_user', JSON.stringify(user));
    } catch {
      // 저장소 접근이 차단되어도 현재 탭에서는 로그인할 수 있게 한다.
      try { localStorage.removeItem('waki_token'); } catch { /* 접근 불가 */ }
      try { localStorage.removeItem('waki_user'); } catch { /* 접근 불가 */ }
    }
    set({ token, user });
  },
  logout: () => {
    try { localStorage.removeItem('waki_token'); } catch { /* 접근 불가 */ }
    try { localStorage.removeItem('waki_user'); } catch { /* 접근 불가 */ }
    set({ token: null, user: null });
  },
}));

import { create } from 'zustand';

type User = { id: string; nickname: string; email: string; avatarUrl?: string } | null;

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
    localStorage.setItem('waki_token', token);
    localStorage.setItem('waki_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('waki_token');
    localStorage.removeItem('waki_user');
    set({ token: null, user: null });
  },
}));

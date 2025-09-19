import { create } from 'zustand';

type User = { id: string; nickname: string; email: string } | null;

type AuthState = {
  token: string | null;
  user: User;
  login: (token: string, user: NonNullable<User>) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  login: (token, user) => set({ token, user }),
  logout: () => set({ token: null, user: null }),
}));



import { create } from 'zustand';

type Toast = { id: string; message: string };

type ToastState = {
  toasts: Toast[];
  push: (message: string) => void;
  remove: (id: string) => void;
};

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message) => {
    const id = Math.random().toString(36).slice(2);
    set({ toasts: [...get().toasts, { id, message }] });
    setTimeout(() => get().remove(id), 3000);
  },
  remove: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));



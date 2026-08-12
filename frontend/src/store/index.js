import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('vb_token') || null,
  user: JSON.parse(localStorage.getItem('vb_user') || 'null'),
  setAuth: (token, user) => {
    localStorage.setItem('vb_token', token);
    localStorage.setItem('vb_user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('vb_token');
    localStorage.removeItem('vb_user');
    set({ token: null, user: null });
  },
}));

export const useVulnStore = create((set) => ({
  tags: [],
  pushTag: (tag) =>
    set((state) => ({
      tags: [{ ...tag, at: Date.now() }, ...state.tags].slice(0, 20),
    })),
  clearTags: () => set({ tags: [] }),
}));

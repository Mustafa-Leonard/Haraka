import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '@haraka/shared-types';
import { apiClient } from '@haraka/api-client';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        apiClient.setToken(token);
        set({ user, token, isAuthenticated: true });
      },
      logout: async () => {
        try {
          await apiClient.logout();
        } catch {}
        apiClient.clearToken();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'haraka_auth',
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          apiClient.setToken(state.token);
        }
      },
    },
  ),
);

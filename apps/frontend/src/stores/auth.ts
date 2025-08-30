import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@repo-guardian/shared';
import { authApi } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initializeAuth: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: (token: string, user: User) => {
        set({
          token,
          user,
          isAuthenticated: true,
          error: null,
        });
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setUser: (user: User) => {
        set({ user });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      initializeAuth: async () => {
        const { token } = get();
        
        if (!token) {
          return;
        }

        set({ isLoading: true });

        try {
          const response = await authApi.getMe();
          if (response.success && response.data) {
            set({
              user: response.data.user,
              isAuthenticated: true,
              error: null,
            });
          } else {
            // Invalid token, clear auth state
            get().logout();
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          get().logout();
        } finally {
          set({ isLoading: false });
        }
      },

      refreshToken: async () => {
        const { token } = get();
        
        if (!token) {
          return;
        }

        try {
          const response = await authApi.refreshToken();
          if (response.success && response.data) {
            set({
              token: response.data.token,
              error: null,
            });
          } else {
            get().logout();
          }
        } catch (error) {
          console.error('Token refresh error:', error);
          get().logout();
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
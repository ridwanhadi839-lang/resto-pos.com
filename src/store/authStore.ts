import { create } from 'zustand';
import {
  getInitialUser,
  onAuthStateChanged,
  signInWithPin,
  signOut,
} from '../services/authService';
import { preloadCatalog } from '../services/orderService';
import { User } from '../types';

interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AuthState {
  currentUser: User | null;
  isBootstrapping: boolean;
  isLoggingIn: boolean;
  authError: string | null;
  initialized: boolean;
  initAuth: () => Promise<void>;
  login: (restaurantCode: string, pin: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
}

let hasSubscribed = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  isBootstrapping: true,
  isLoggingIn: false,
  authError: null,
  initialized: false,

  initAuth: async () => {
    if (get().initialized) return;

    set({ isBootstrapping: true, authError: null });
    try {
      const user = await getInitialUser();
      set({ currentUser: user });
      if (user) {
        void preloadCatalog();
      }
    } catch (error) {
      set({
        authError: error instanceof Error ? error.message : 'Gagal inisialisasi auth.',
      });
    } finally {
      set({ initialized: true, isBootstrapping: false });
    }

    if (!hasSubscribed) {
      hasSubscribed = true;
      onAuthStateChanged((user) => {
        set({ currentUser: user, authError: null });
      });
    }
  },

  login: async (restaurantCode, pin) => {
    set({ isLoggingIn: true, authError: null });
    try {
      const result = await signInWithPin(restaurantCode, pin);
      if (!result.ok || !result.user) {
        set({ isLoggingIn: false, authError: result.error ?? 'Login gagal.' });
        return { ok: false, error: result.error ?? 'Login gagal.' };
      }

      set({ currentUser: result.user, isLoggingIn: false, authError: null });
      void preloadCatalog();
      return { ok: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login gagal.';
      set({ isLoggingIn: false, authError: errorMessage });
      return { ok: false, error: errorMessage };
    }
  },

  logout: async () => {
    await signOut();
    set({ currentUser: null, authError: null });
  },
}));

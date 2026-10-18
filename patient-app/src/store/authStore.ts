import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { ACCESS_KEY, REFRESH_KEY, USER_KEY } from '../api/storageKeys';
import type { AuthUser, AuthTokens } from '../api/auth';

interface AuthState {
  user: AuthUser | null;
  ready: boolean; // finished restoring session from secure store
  isAuthenticated: boolean;
  restore: () => Promise<void>;
  signIn: (user: AuthUser, tokens: AuthTokens) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: false,
  isAuthenticated: false,

  restore: async () => {
    try {
      const [token, userJson] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);
      if (token && userJson) {
        set({ user: JSON.parse(userJson), isAuthenticated: true, ready: true });
        return;
      }
    } catch {
      /* ignore */
    }
    set({ ready: true });
  },

  signIn: async (user, tokens) => {
    await SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
    set({ user: null, isAuthenticated: false });
  },
}));

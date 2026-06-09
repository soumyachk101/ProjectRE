import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  setTokens: (access: string, refresh: string) => Promise<void>;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isHydrated: false,

  setTokens: async (access, refresh) => {
    await SecureStore.setItemAsync('access_token', access);
    await SecureStore.setItemAsync('refresh_token', refresh);
    set({ accessToken: access, isAuthenticated: true });
  },

  setUser: (user) => {
    SecureStore.setItemAsync('user_data', JSON.stringify(user)).catch(() => {});
    set({ user });
  },

  logout: async () => {
    await Promise.allSettled([
      SecureStore.deleteItemAsync('access_token'),
      SecureStore.deleteItemAsync('refresh_token'),
      SecureStore.deleteItemAsync('user_data'),
    ]);
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    try {
      const [token, userData] = await Promise.all([
        SecureStore.getItemAsync('access_token'),
        SecureStore.getItemAsync('user_data'),
      ]);
      const user = userData ? JSON.parse(userData) : null;
      if (token) set({ accessToken: token, isAuthenticated: true, user });
    } catch {
      await Promise.allSettled([
        SecureStore.deleteItemAsync('access_token'),
        SecureStore.deleteItemAsync('refresh_token'),
        SecureStore.deleteItemAsync('user_data'),
      ]);
      set({ user: null, accessToken: null, isAuthenticated: false });
    } finally {
      set({ isHydrated: true });
    }
  },
}));

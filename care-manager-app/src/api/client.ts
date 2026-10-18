import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config';
import { useAuthStore } from '../store/authStore';
import { useNetworkStore } from '../store/networkStore';
import { queryClient } from '../queryClient';

export { ACCESS_KEY, REFRESH_KEY } from './storageKeys';
import { ACCESS_KEY, REFRESH_KEY } from './storageKeys';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 8000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync(ACCESS_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    /* proceed unauthenticated */
  }
  return config;
});

// Response interceptor: track network connectivity and handle 401 refresh
api.interceptors.response.use(
  (res) => {
    useNetworkStore.getState().clearOffline();
    return res;
  },
  async (error) => {
    const config = error.config || {};
    const status = error.response?.status;

    // Detect network disconnect / server unreachable
    if (!error.response || error.code === 'ECONNABORTED' || error.message?.includes('Network Error')) {
      useNetworkStore.getState().setOffline(true, 'Cannot reach PRANOVA coordination server');
    }

    if (status === 401 && !config._refreshed) {
      config._refreshed = true;
      try {
        const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
        if (refreshToken) {
          const r = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken }, { timeout: 6000 });
          const next = r.data?.data?.tokens?.accessToken;
          const nextRefresh = r.data?.data?.tokens?.refreshToken;
          if (next) {
            await SecureStore.setItemAsync(ACCESS_KEY, next);
            if (nextRefresh) await SecureStore.setItemAsync(REFRESH_KEY, nextRefresh);
            config.headers.Authorization = `Bearer ${next}`;
            return api(config);
          }
        }
      } catch (refreshErr) {
        console.warn('[AUTH] Care manager session refresh failed:', refreshErr);
      }

      // Terminate session, clear query cache, and redirect to login
      console.warn('[AUTH] Refresh failed for Care Manager. Forcing sign-out to prevent 401 loop.');
      try {
        await useAuthStore.getState().signOut();
        queryClient.clear();
      } catch (signOutErr) {
        console.error('[AUTH] Sign-out cleanup error:', signOutErr);
      }
    }
    return Promise.reject(error);
  }
);

export function unwrap<T = any>(res: { data: { data: T; meta?: any } }): { data: T; meta?: any } {
  return { data: res.data.data, meta: res.data.meta };
}

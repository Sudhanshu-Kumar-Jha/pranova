import { AuthProvider } from 'react-admin';
import axios from 'axios';
import { API_URL } from '../config.js';

const API_BASE_URL = API_URL;

// In-Memory Secure Token Store: Refresh token is strictly kept in-memory to prevent XSS localStorage persistence
let inMemoryRefreshToken: string | null = null;

export const getSecureRefreshToken = (): string | null => inMemoryRefreshToken;
export const setSecureRefreshToken = (token: string | null) => {
  inMemoryRefreshToken = token;
};

export const authProvider: AuthProvider = {
  login: async ({ username, password }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/admin/login`,
        { email: username, password },
        { withCredentials: true }
      );

      const { data } = response.data;
      if (!data || !data.tokens?.accessToken) {
        throw new Error('Authentication response did not contain access token');
      }

      // Access token in localStorage for current session API calls
      localStorage.setItem('pranova_access_token', data.tokens.accessToken);
      // Cleanse any legacy refresh token from localStorage for compliance
      localStorage.removeItem('pranova_refresh_token');

      // Secure in-memory refresh token
      setSecureRefreshToken(data.tokens.refreshToken || null);
      localStorage.setItem('pranova_user', JSON.stringify(data.user));

      return Promise.resolve();
    } catch (error) {
      const err = error as { response?: { data?: { message?: string; errors?: Array<{ message: string }> } }; message?: string };
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        'Authentication failed. Please verify your credentials.';
      return Promise.reject(new Error(errorMessage));
    }
  },

  logout: () => {
    localStorage.removeItem('pranova_access_token');
    localStorage.removeItem('pranova_refresh_token');
    localStorage.removeItem('pranova_user');
    setSecureRefreshToken(null);
    return Promise.resolve();
  },

  checkError: (error) => {
    const err = error as { status?: number; statusCode?: number; response?: { status?: number } };
    const status = err.status || err.statusCode || err.response?.status;
    if (status === 401 || status === 403) {
      localStorage.removeItem('pranova_access_token');
      localStorage.removeItem('pranova_refresh_token');
      localStorage.removeItem('pranova_user');
      setSecureRefreshToken(null);
      return Promise.reject();
    }
    return Promise.resolve();
  },

  checkAuth: () => {
    return localStorage.getItem('pranova_access_token')
      ? Promise.resolve()
      : Promise.reject({ message: 'Authentication required' });
  },

  getPermissions: () => {
    const userStr = localStorage.getItem('pranova_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return Promise.resolve(user.role || 'ADMIN');
      } catch {
        return Promise.resolve('ADMIN');
      }
    }
    return Promise.resolve('ADMIN');
  },

  getIdentity: () => {
    const userStr = localStorage.getItem('pranova_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return Promise.resolve({
          id: user.id,
          fullName: `${user.firstName || 'Admin'} ${user.lastName || 'User'}`.trim(),
          avatar: undefined,
        });
      } catch {
        // fallback
      }
    }
    return Promise.resolve({
      id: 'admin',
      fullName: 'PRANOVA Administrator',
    });
  },
};

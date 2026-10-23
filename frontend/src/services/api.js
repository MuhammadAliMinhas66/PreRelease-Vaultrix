import axios from 'axios';
import { getDeviceFallbackId } from '../utils/deviceFallbackId.js';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 20000,
  headers: {
    // Backs up the server's own httpOnly device cookie for the per-device
    // account-creation limit - see utils/deviceFallbackId.js for why this
    // needs to be a second, independent signal rather than relying on the
    // cookie alone.
    'X-Device-Fallback-Id': getDeviceFallbackId(),
  },
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

let onUnauthorized = null;

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

const NOT_A_SESSION_EXPIRY = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/logout', '/auth/google', '/users/me/password'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isSessionCheck = !NOT_A_SESSION_EXPIRY.some((path) => url.includes(path));
    if (error.response?.status === 401 && onUnauthorized && isSessionCheck) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;

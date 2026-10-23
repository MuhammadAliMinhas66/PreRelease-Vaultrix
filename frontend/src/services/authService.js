import api from './api.js';
import { toApiError } from './apiError.js';

export const signup = async (payload) => {
  try {
    const { data } = await api.post('/auth/signup', payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const verifySignupCode = async ({ email, code }) => {
  try {
    const { data } = await api.post('/auth/signup/verify', { email, code });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const login = async (payload) => {
  try {
    const { data } = await api.post('/auth/login', payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getLoginStatus = async (email) => {
  try {
    const { data } = await api.post('/auth/login-status', { email });
    return data;
  } catch (error) {
    return null;
  }
};

export const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch (error) {
    // logout failing quietly is fine, the session will expire on its own
  }
};

export const refresh = async () => {
  try {
    const { data } = await api.post('/auth/refresh');
    return data;
  } catch (error) {
    return null;
  }
};

export const me = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};

export const googleAuth = async (idToken) => {
  try {
    const { data } = await api.post('/auth/google', { idToken });
    return data;
  } catch (error) {
    throw toApiError(error, 'auth.googleFailed');
  }
};

export const linkGoogleAccount = async (idToken) => {
  try {
    const { data } = await api.post('/auth/link-google', { idToken });
    return data;
  } catch (error) {
    throw toApiError(error, 'auth.googleFailed');
  }
};

export const unlinkGoogleAccount = async (password) => {
  try {
    const { data } = await api.post('/auth/unlink-google', { password });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const verifyDeviceLogin = async ({ email, code }) => {
  try {
    const { data } = await api.post('/auth/verify-device', { email, code });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const verifyMfaLogin = async ({ mfaToken, code }) => {
  try {
    const { data } = await api.post('/auth/verify-mfa', { mfaToken, code });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const validateEmail = async (email) => {
  const { data } = await api.post('/auth/validate-email', { email });
  return data;
};

export const requestPasswordReset = async ({ email, captchaToken, resend = false }) => {
  try {
    const { data } = await api.post('/auth/forgot-password', { email, captchaToken, resend });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const verifyResetCode = async ({ email, code }) => {
  try {
    const { data } = await api.post('/auth/verify-reset-code', { email, code });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const resetPassword = async ({ resetToken, newPassword }) => {
  try {
    const { data } = await api.post('/auth/reset-password', { resetToken, newPassword });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

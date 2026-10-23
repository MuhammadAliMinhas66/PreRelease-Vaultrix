import api from './api.js';
import { toApiError } from './apiError.js';

export const updateProfile = async (payload) => {
  try {
    const { data } = await api.patch('/users/me', payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const changePassword = async (payload) => {
  try {
    const { data } = await api.post('/users/me/password', payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const uploadAvatar = async (file) => {
  try {
    const form = new FormData();
    form.append('avatar', file);
    const { data } = await api.post('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const listSessions = async () => {
  try {
    const { data } = await api.get('/users/me/sessions');
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const revokeSession = async (id) => {
  try {
    const { data } = await api.delete(`/users/me/sessions/${id}`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const logoutAllSessions = async () => {
  try {
    const { data } = await api.post('/users/me/sessions/logout-all');
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const requestEmailChange = async ({ newEmail, password }) => {
  try {
    const { data } = await api.post('/users/me/email/request-change', { newEmail, password });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const verifyEmailChange = async ({ oldCode, newCode }) => {
  try {
    const { data } = await api.post('/users/me/email/verify-change', { oldCode, newCode });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const requestAccountDeletion = async (payload) => {
  try {
    const { data } = await api.post('/users/me/delete/request', payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const confirmAccountDeletion = async (code) => {
  try {
    const { data } = await api.post('/users/me/delete/confirm', { code });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const beginMfaSetup = async () => {
  try {
    const { data } = await api.post('/users/me/mfa/setup');
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const confirmMfaSetup = async ({ setupToken, code }) => {
  try {
    const { data } = await api.post('/users/me/mfa/confirm', { setupToken, code });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const disableMfa = async (password) => {
  try {
    const { data } = await api.post('/users/me/mfa/disable', { password });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

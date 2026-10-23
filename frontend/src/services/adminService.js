import api from './api.js';
import { toApiError } from './apiError.js';

export const getAdminOverview = async () => {
  try {
    const { data } = await api.get('/admin/overview');
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const listAdminUsers = async ({ page = 1, search = '', status = 'all' } = {}) => {
  try {
    const { data } = await api.get('/admin/users', { params: { page, search, status } });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getAdminUserDetail = async (id) => {
  try {
    const { data } = await api.get(`/admin/users/${id}`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const updateAdminUser = async (id, payload) => {
  try {
    const { data } = await api.patch(`/admin/users/${id}`, payload);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const deactivateAdminUser = async (id) => {
  try {
    const { data } = await api.post(`/admin/users/${id}/deactivate`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const reactivateAdminUser = async (id) => {
  try {
    const { data } = await api.post(`/admin/users/${id}/reactivate`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const deleteAdminUser = async (id) => {
  try {
    const { data } = await api.delete(`/admin/users/${id}`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const forceAdminPasswordReset = async (id) => {
  try {
    const { data } = await api.post(`/admin/users/${id}/force-password-reset`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const disableAdminUserMfa = async (id) => {
  try {
    const { data } = await api.post(`/admin/users/${id}/disable-mfa`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const revokeAdminUserSession = async (userId, sessionId) => {
  try {
    const { data } = await api.delete(`/admin/users/${userId}/sessions/${sessionId}`);
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

export const getAdminAuditLog = async ({ page = 1, event = '' } = {}) => {
  try {
    const { data } = await api.get('/admin/audit-log', { params: { page, event } });
    return data;
  } catch (error) {
    throw toApiError(error);
  }
};

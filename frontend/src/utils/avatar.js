const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SERVER_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export const resolveAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  return `${SERVER_ORIGIN}${avatarUrl}`;
};

export const initialsFromName = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

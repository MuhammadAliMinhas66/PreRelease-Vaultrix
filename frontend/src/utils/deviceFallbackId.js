// A second, non-httpOnly device signal that backs up the server's own
// device cookie (see backend/src/middleware/deviceId.js) for the per-device
// account-creation limit. Deliberately generated and stored in
// localStorage, not sessionStorage or an in-memory variable, so it survives
// closing the tab/browser and keeps identifying the same device across
// visits - clearing cookies alone isn't enough to reset it, and clearing
// site data alone (without also clearing cookies) isn't enough either.
const STORAGE_KEY = 'vx_device_fallback_id';

const randomId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Old-browser fallback - doesn't need to be cryptographically strong,
  // just stable and effectively unique per device.
  return `fid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

export const getDeviceFallbackId = () => {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created = randomId();
    window.localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch (error) {
    // Private browsing / blocked storage - fall back to session-only, so
    // the header is still well-formed even though it won't persist.
    return randomId();
  }
};

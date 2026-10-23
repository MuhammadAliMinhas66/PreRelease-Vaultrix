import User from '../models/User.js';

// How many Vaultrix accounts a single device is allowed to create, counting
// across every email/Google identity used from it. Chosen as a reasonable
// ceiling for legitimate use (a shared family computer, a few throwaway
// test signups) while still blocking bulk account creation.
export const MAX_ACCOUNTS_PER_DEVICE = 3;

// Counts how many existing accounts were created from this same device,
// matching on EITHER device signal (see middleware/deviceId.js) so clearing
// only one of them doesn't reset the count. Both signals are optional -
// a request with neither (e.g. a very old session, or cookies blocked
// entirely) simply isn't limited by this check, which is an acceptable
// trade-off: this is an abuse deterrent, not an authentication boundary.
export const accountsOnDevice = async ({ deviceId, deviceFallbackId }) => {
  const or = [];
  if (deviceId) or.push({ signupDeviceId: deviceId });
  if (deviceFallbackId) or.push({ signupDeviceFallbackId: deviceFallbackId });
  if (or.length === 0) return 0;
  return User.countDocuments({ $or: or });
};

export const deviceAccountLimitReached = async (req) =>
  (await accountsOnDevice({ deviceId: req.deviceId, deviceFallbackId: req.deviceFallbackId })) >=
  MAX_ACCOUNTS_PER_DEVICE;

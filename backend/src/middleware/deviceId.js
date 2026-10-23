import crypto from 'crypto';

// Identifies "this device" well enough to cap how many accounts can be
// created from it, without relying on IP address - an IP changes every time
// someone switches VPN servers, but this cookie does not.
//
// Two independent signals are kept, deliberately redundant:
//   - vx_did:  an httpOnly cookie, invisible to page JavaScript (can't be
//              read or wiped by a script), set the first time any request
//              reaches the API and reused after that.
//   - X-Device-Fallback-Id: a second id the FRONTEND generates itself and
//              keeps in localStorage, sent back as a request header. It
//              survives a plain "clear cookies" that leaves site data
//              alone, and the reverse is also true - localStorage being
//              cleared doesn't touch the httpOnly cookie.
// The account-creation limit in utils/deviceLimit.js counts a match on
// EITHER signal, so clearing just one of them isn't enough to reset the
// count. This is not unbeatable (a determined person can still clear both,
// or use a different browser profile) - no device signal sent by a browser
// ever is - but it is a real step up from counting raw IP addresses, which
// a VPN defeats with a single click.
const DEVICE_COOKIE_NAME = 'vx_did';
const DEVICE_COOKIE_MAX_AGE_MS = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years

const deviceCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: DEVICE_COOKIE_MAX_AGE_MS,
};

const FALLBACK_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export const attachDeviceId = (req, res, next) => {
  let deviceId = req.cookies?.[DEVICE_COOKIE_NAME];
  if (typeof deviceId !== 'string' || !/^[0-9a-f-]{36}$/.test(deviceId)) {
    deviceId = crypto.randomUUID();
    res.cookie(DEVICE_COOKIE_NAME, deviceId, deviceCookieOptions);
  }
  req.deviceId = deviceId;

  const fallbackHeader = req.headers['x-device-fallback-id'];
  req.deviceFallbackId =
    typeof fallbackHeader === 'string' && FALLBACK_ID_PATTERN.test(fallbackHeader) ? fallbackHeader : null;

  next();
};

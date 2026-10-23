// Turns a raw User-Agent string into something a person can recognize at a
// glance in a "your devices" list, e.g. "Chrome on Windows". Deliberately
// simple (no dependency) - it only needs to be good enough to tell devices
// apart, not a full UA parser.
export const describeDevice = (userAgent) => {
  const ua = typeof userAgent === 'string' ? userAgent : '';

  let os = 'an unknown device';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'a browser';
  if (/edg\//i.test(ua)) browser = 'Edge';
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = 'Opera';
  else if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) browser = 'Chrome';
  else if (/firefox\//i.test(ua)) browser = 'Firefox';
  else if (/safari\//i.test(ua) && !/chrome\//i.test(ua)) browser = 'Safari';

  if (os === 'an unknown device') return browser === 'a browser' ? 'Unknown device' : browser;
  return `${browser} on ${os}`;
};

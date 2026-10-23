const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const scrub = (value, depth = 0) => {
  if (typeof value === 'string') return value.replace(/\u0000/g, '');

  if (Array.isArray(value)) {
    if (depth > 5) return [];
    return value.map((item) => scrub(item, depth + 1));
  }

  if (isPlainObject(value)) {
    if (depth > 5) return {};
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.') || UNSAFE_KEYS.has(key)) {
        delete value[key];
      } else {
        value[key] = scrub(value[key], depth + 1);
      }
    }
    return value;
  }

  return value;
};

export const sanitizeInput = (req, res, next) => {
  req.body = scrub(isPlainObject(req.body) ? req.body : {});

  if (isPlainObject(req.query)) {
    for (const key of Object.keys(req.query)) {
      const current = req.query[key];
      if (Array.isArray(current)) req.query[key] = current[current.length - 1];
    }
    scrub(req.query);
  }

  next();
};

export const noStore = (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  next();
};

export const allowedOrigins = () =>
  String(process.env.CLIENT_URL || '')
    .split(',')
    .map((item) => item.trim().replace(/\/$/, ''))
    .filter(Boolean);

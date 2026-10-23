import SecurityEvent from '../models/SecurityEvent.js';

export const securityLog = (event, req, details = {}) => {
  const path = req?.originalUrl ? req.originalUrl.split('?')[0] : undefined;
  const entry = {
    time: new Date().toISOString(),
    event,
    ip: req?.ip,
    path,
    ...details,
  };
  console.warn('[security]', JSON.stringify(entry));

  // Fire-and-forget: never let a logging failure affect the request that
  // triggered it. userId may already be a valid ObjectId string from the
  // caller (e.g. String(user._id)); anything else is just left out.
  const { userId, ...rest } = details;
  SecurityEvent.create({ event, userId, ip: req?.ip, path, details: rest }).catch((error) => {
    console.error('Could not persist security event:', error.message);
  });
};

import mongoose from 'mongoose';

// One row per signed-in device/browser. The row's own _id is used as the
// refresh token's "jti" - deleting a row immediately invalidates that one
// refresh token without touching any other device's session, which is what
// makes per-device logout and a "your devices" list possible. The TTL index
// below means Mongo auto-deletes a row once its refresh token has expired,
// so there's nothing to clean up manually.
const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userAgent: { type: String, default: '' },
  ip: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
});

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sessionSchema.index({ userId: 1, lastUsedAt: -1 });

export default mongoose.model('Session', sessionSchema);

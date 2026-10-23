import mongoose from 'mongoose';

// One pending row per user who hit the 2-device sign-in limit and needs to
// prove, via a code sent to their own inbox, that it's really them signing
// in on a 3rd device before the oldest device is signed out to make room.
const pendingDeviceLoginSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    sendCount: { type: Number, default: 1 },
    windowStartedAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true },
    userAgent: { type: String, default: '' },
    ip: { type: String, default: '' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

pendingDeviceLoginSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PendingDeviceLogin', pendingDeviceLoginSchema);

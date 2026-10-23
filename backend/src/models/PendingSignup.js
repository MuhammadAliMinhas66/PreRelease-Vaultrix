import mongoose from 'mongoose';

const pendingSignupSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    passwordHash: { type: String, required: true },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    sendCount: { type: Number, default: 1 },
    windowStartedAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    // Carried over onto the real User document once the code is confirmed
    // (see verifySignupOtp) - captured here, at request time, rather than
    // re-read from the verify request, so a device limit check can't be
    // dodged by sending the OTP-send request from one device/cookie state
    // and the verify request from another.
    deviceId: { type: String, default: null },
    deviceFallbackId: { type: String, default: null },
  },
  { timestamps: true }
);

pendingSignupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PendingSignup', pendingSignupSchema);

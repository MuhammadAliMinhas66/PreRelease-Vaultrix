import mongoose from 'mongoose';

const passwordResetSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    sendCount: { type: Number, default: 1 },
    windowStartedAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
    resetNonce: { type: String, default: null },
    resetExpiresAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PasswordReset', passwordResetSchema);

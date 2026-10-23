import mongoose from 'mongoose';

// One pending row per user mid-way through changing their email. Two codes
// are sent out: one to the CURRENT (old) address, proving whoever is making
// this change still controls the inbox that's about to be replaced, and one
// to the NEW address, proving they actually own it. Both must be entered
// correctly before the email on the account actually changes.
const pendingEmailChangeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    newEmail: { type: String, required: true, lowercase: true },
    oldEmailOtpHash: { type: String, required: true },
    newEmailOtpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    sendCount: { type: Number, default: 1 },
    windowStartedAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

pendingEmailChangeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PendingEmailChange', pendingEmailChangeSchema);

import mongoose from 'mongoose';

// One pending row per user who confirmed their password (or typed DELETE,
// for a Google account) and is now waiting on a code emailed to their own
// address before the account is actually, permanently deleted.
const pendingAccountDeletionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    otpHash: { type: String, required: true },
    otpExpiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    sendCount: { type: Number, default: 1 },
    windowStartedAt: { type: Date, required: true },
    lastSentAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

pendingAccountDeletionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PendingAccountDeletion', pendingAccountDeletionSchema);

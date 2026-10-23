import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String },
    role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'], default: 'owner' },
    plan: { type: String, enum: ['standard', 'premium'], default: 'standard' },
    country: { type: String },
    currency: { type: String },
    language: { type: String },
    avatarUrl: { type: String, default: '' },
    onboardingCompleted: { type: Boolean, default: false },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecret: { type: String }, // encrypted at rest, see utils/mfaCrypto.js
    mfaBackupCodes: {
      type: [{ codeHash: String, usedAt: { type: Date, default: null } }],
      default: [],
    },
    usernameChangedAt: { type: Date, default: null },
    emailChangedAt: { type: Date, default: null },
    nameHistory: {
      type: [{ value: String, changedAt: Date }],
      default: [],
    },
    emailHistory: {
      type: [{ value: String, changedAt: Date }],
      default: [],
    },
    googleUnlinkedAt: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lockTier: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    // Device signals captured at account-creation time only, used purely to
    // enforce the per-device account limit (see utils/deviceLimit.js) -
    // never updated after signup, and never used for anything else.
    signupDeviceId: { type: String, default: null },
    signupDeviceFallbackId: { type: String, default: null },
    // Admin-only moderation. A deactivated account can't log in (checked in
    // authController and the auth middleware) but its data is kept - this
    // is the reversible "suspend" action; adminController.deleteUser is the
    // separate, permanent one.
    isActive: { type: Boolean, default: true },
    deactivatedAt: { type: Date, default: null },
    deactivatedBy: { type: String, default: null }, // the admin's email, for the audit trail
  },
  { timestamps: true }
);

userSchema.index({ signupDeviceId: 1 });
userSchema.index({ signupDeviceFallbackId: 1 });
userSchema.index({ isActive: 1 });

export default mongoose.model('User', userSchema);

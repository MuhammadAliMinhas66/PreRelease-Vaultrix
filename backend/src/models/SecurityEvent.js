import mongoose from 'mongoose';

// A capped collection: Mongo automatically discards the oldest documents once
// the size/count limit is hit, so this never needs manual cleanup. It exists
// so security events (failed logins, lockouts, CSRF mismatches, etc.) are
// actually queryable after the fact instead of only living in server logs.
const securityEventSchema = new mongoose.Schema(
  {
    event: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ip: { type: String },
    path: { type: String },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
    capped: { size: 50 * 1024 * 1024, max: 200000 },
  }
);

securityEventSchema.index({ event: 1, createdAt: -1 });
securityEventSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('SecurityEvent', securityEventSchema);

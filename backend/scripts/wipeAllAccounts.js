// Wipes every account and everything tied to one, so you can re-test signup,
// OTP verification, Google sign-in, and lockouts from a completely clean
// slate using the same emails again.
//
// Deletes: Users, Organizations, PendingSignups (unfinished signups waiting
// on an OTP), PasswordResets (in-progress resets), Sessions (signed-in
// devices).
// Left alone on purpose: SecurityEvents (your audit log of lockouts/failed
// logins/etc.) - pass --wipe-security-events too if you want that cleared
// as well.
//
// This hits your real MONGODB_URI, so it works the same against local or
// Atlas - be sure that's pointed at your dev database, not production.
//
// Usage (run from the backend folder):
//   node scripts/wipeAllAccounts.js --yes-delete-everything
//   node scripts/wipeAllAccounts.js --yes-delete-everything --wipe-security-events

import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Organization from '../src/models/Organization.js';
import PendingSignup from '../src/models/PendingSignup.js';
import PasswordReset from '../src/models/PasswordReset.js';
import Session from '../src/models/Session.js';
import SecurityEvent from '../src/models/SecurityEvent.js';

const args = process.argv.slice(2);

if (!args.includes('--yes-delete-everything')) {
  console.error('This deletes every account. Re-run with --yes-delete-everything to confirm.');
  console.error('  node scripts/wipeAllAccounts.js --yes-delete-everything');
  process.exit(1);
}

const wipeSecurityEvents = args.includes('--wipe-security-events');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const [userCount, orgCount, pendingCount, resetCount, sessionCount] = await Promise.all([
    User.countDocuments(),
    Organization.countDocuments(),
    PendingSignup.countDocuments(),
    PasswordReset.countDocuments(),
    Session.countDocuments(),
  ]);

  console.log(
    `Deleting ${userCount} user(s), ${orgCount} organization(s), ${pendingCount} pending signup(s), ${resetCount} password reset(s), ${sessionCount} session(s)...`
  );

  await Promise.all([
    User.deleteMany({}),
    Organization.deleteMany({}),
    PendingSignup.deleteMany({}),
    PasswordReset.deleteMany({}),
    Session.deleteMany({}),
  ]);

  if (wipeSecurityEvents) {
    const securityCount = await SecurityEvent.countDocuments();
    await SecurityEvent.deleteMany({});
    console.log(`Also deleted ${securityCount} security event(s).`);
  }

  console.log('Done. Every account is gone - the same emails (Google or manual) can sign up fresh now.');

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('Wipe failed:', error.message);
  process.exit(1);
});

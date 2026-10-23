import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/unlockAccount.js you@example.com');
  process.exit(1);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);

  const result = await User.updateOne(
    { email: email.toLowerCase().trim() },
    { $set: { failedLoginAttempts: 0, lockUntil: null, lockTier: 0 } }
  );

  if (result.matchedCount === 0) {
    console.log(`No account found for ${email}.`);
  } else {
    console.log(`Unlocked ${email}.`);
  }

  await mongoose.disconnect();
}

run().catch((error) => {
  console.error('Failed to unlock account:', error.message);
  process.exit(1);
});

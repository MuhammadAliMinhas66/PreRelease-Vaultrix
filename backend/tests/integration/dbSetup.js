import { beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Not a vitest "setupFiles" entry on purpose: every integration test file
// does `import './dbSetup.js';` at the top, which registers these
// beforeAll/afterEach/afterAll hooks into THAT file's suite. Plain unit
// test files (tests/unit/**) never import this, so they never spin up
// MongoDB and stay fast and dependency-free.
//
// A single in-memory MongoDB instance is shared by the whole test run (see
// fileParallelism: false in vitest.config.js) - it's wiped between every
// individual test (afterEach below), so tests never see each other's data,
// but we only pay the "start a Mongo instance" cost once.
//
// NOTE: the very first time this runs on a machine, mongodb-memory-server
// downloads a real MongoDB binary (~70MB) and caches it. That needs an
// internet connection. After that first run it's fully offline and fast.
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}, 120000);

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

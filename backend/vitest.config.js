import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    // Integration tests spin up a real (in-memory) MongoDB and exercise
    // full HTTP request/response cycles through supertest, so they need
    // more headroom than vitest's default timeouts.
    testTimeout: 20000,
    hookTimeout: 60000,
    // Runs test files one at a time, sharing a single in-memory MongoDB
    // instance (see tests/integration/dbSetup.js, imported individually by
    // every integration test file) - integration tests touch overlapping
    // collections (User, Session, ...) and would collide if run in
    // parallel against the same database. Plain unit tests don't import
    // dbSetup.js at all, so they never need MongoDB and always run fast.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      JWT_ACCESS_SECRET: 'vaultrix_test_access_secret_please_do_not_use_in_prod_00',
      JWT_REFRESH_SECRET: 'vaultrix_test_refresh_secret_please_do_not_use_in_prod_0',
      CLIENT_URL: 'http://localhost:5173',
      GOOGLE_CLIENT_ID: 'test-google-client-id.apps.googleusercontent.com',
    },
  },
});

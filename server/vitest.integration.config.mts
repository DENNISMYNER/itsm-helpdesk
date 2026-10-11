import { defineConfig } from 'vitest/config';

/**
 * Integration tests talk to a real, disposable PostgreSQL database.
 *
 * Set DATABASE_URL_TEST (see README -> "Running the tests"). The global setup wipes that
 * database's `public` schema and replays the SQL migrations before the suites start, so
 * point it at a throw-away database, never at your development data.
 */
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    globalSetup: ['tests/integration/global-setup.ts'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      // The application reads DATABASE_URL; tests must never touch the development database.
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? '',
      JWT_SECRET: 'integration-test-secret-integration-test-secret',
      CLIENT_ORIGIN: 'http://localhost:5173',
    },
  },
});

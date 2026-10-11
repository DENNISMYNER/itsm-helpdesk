import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from 'pg';

/**
 * Gives the integration suite a pristine database: wipes the `public` schema and replays
 * every SQL migration in order. Dropping the schema (rather than deleting rows) is required
 * because the audit log is append-only by design - its triggers reject DELETE and TRUNCATE.
 *
 * Uses plain `pg`, so the Prisma CLI is not needed to run the tests.
 */
export default async function setup(): Promise<void> {
  const connectionString = process.env.DATABASE_URL_TEST;
  if (!connectionString) return; // suites skip themselves when no test database is configured

  // `npm run test:integration` always runs from the server package directory.
  const migrationsDir = join(process.cwd(), 'prisma', 'migrations');
  const migrations = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    for (const name of migrations) {
      await client.query(readFileSync(join(migrationsDir, name, 'migration.sql'), 'utf8'));
    }
  } finally {
    await client.end();
  }
}

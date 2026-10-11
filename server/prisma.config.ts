import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// DATABASE_URL is only required by commands that connect (migrate, seed).
// `prisma generate` runs in `postinstall`, before a .env file may exist,
// so a harmless local default keeps installation from failing.
const databaseUrl =
  process.env.DATABASE_URL ?? 'postgresql://itsm:itsm_password@localhost:5432/itsm';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});

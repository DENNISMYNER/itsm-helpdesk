import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { env } from '../config/env';

/**
 * Single shared Prisma client. Prisma 7 talks to PostgreSQL through the
 * `pg` driver adapter, so the connection pool is configured here.
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export { Prisma };

/** Either the root client or an interactive-transaction client. */
export type DbClient = Prisma.TransactionClient;

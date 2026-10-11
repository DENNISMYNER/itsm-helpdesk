import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .default(12),
  CLIENT_ORIGIN: z.url().default('http://localhost:5173'),
  ASSIGNMENT_STRATEGY: z.enum(['LEAST_ACTIVE', 'ROUND_ROBIN']).default('LEAST_ACTIVE'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    console.error(`Invalid environment configuration:\n${lines.join('\n')}`);
    process.exit(1);
  }
  return result.data;
}

export const env: Env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';

import { z } from 'zod';

export const RANGE_OPTIONS = ['7', '14', '30', '90'] as const;

export const overviewQuerySchema = z.object({
  days: z.enum(RANGE_OPTIONS).default('30').transform(Number),
});
export type OverviewQuery = z.infer<typeof overviewQuerySchema>;

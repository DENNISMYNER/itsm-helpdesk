import { z } from 'zod';

/** Validates the `:id` route parameter shared by most resources. */
export const idParamSchema = z.object({
  id: z.string().min(1).max(64),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function buildPage<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Accepts `a,b,c` (or repeated params) and yields a validated, optional array. */
export function csvList<T extends z.ZodType>(item: T) {
  return z.preprocess((value) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
    }
    return value;
  }, z.array(item).optional());
}

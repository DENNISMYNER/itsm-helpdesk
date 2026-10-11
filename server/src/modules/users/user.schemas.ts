import { z } from 'zod';
import { Role, TicketCategory } from '../../domain/enums';
import { paginationSchema } from '../../lib/http';

export const listUsersQuerySchema = paginationSchema.extend({
  q: z.string().trim().min(1).max(100).optional(),
  role: z.enum(Role).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;

export const updateUserSchema = z
  .object({
    role: z.enum(Role).optional(),
    isActive: z.boolean().optional(),
    skills: z.array(z.enum(TicketCategory)).max(Object.keys(TicketCategory).length).optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: 'Provide at least one field to update',
  });
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

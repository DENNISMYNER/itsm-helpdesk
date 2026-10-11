import { z } from 'zod';
import { TicketCategory, TicketPriority, TicketStatus } from '../../domain/enums';
import { csvList, paginationSchema } from '../../lib/http';

export const createTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string()
    .trim()
    .min(10, 'Please describe the problem in at least 10 characters')
    .max(5000, 'Description must be at most 5000 characters'),
  category: z.enum(TicketCategory).default(TicketCategory.OTHER),
  priority: z.enum(TicketPriority).default(TicketPriority.MEDIUM),
});
export type CreateTicketInput = z.infer<typeof createTicketSchema>;

export const TICKET_SORTS = ['newest', 'oldest', 'updated', 'priority'] as const;
export type TicketSort = (typeof TICKET_SORTS)[number];

export const listTicketsQuerySchema = paginationSchema.extend({
  status: csvList(z.enum(TicketStatus)),
  priority: csvList(z.enum(TicketPriority)),
  category: csvList(z.enum(TicketCategory)),
  /** `me`, `unassigned`, or a user id. Ignored for customers. */
  assignee: z.string().trim().min(1).max(64).optional(),
  /** Matches a ticket number (`1042`, `#1042`, `ITSM-1042`) or part of the title. */
  q: z.string().trim().min(1).max(100).optional(),
  sort: z.enum(TICKET_SORTS).default('newest'),
});
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;

export const changeStatusSchema = z.object({ status: z.enum(TicketStatus) });
export const assignTicketSchema = z.object({ assigneeId: z.string().min(1).max(64).nullable() });
export const changePrioritySchema = z.object({ priority: z.enum(TicketPriority) });

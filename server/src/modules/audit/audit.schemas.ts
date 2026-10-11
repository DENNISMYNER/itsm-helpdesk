import { z } from 'zod';
import { AuditAction } from '../../domain/enums';
import { csvList, paginationSchema } from '../../lib/http';

export const listAuditQuerySchema = paginationSchema.extend({
  action: csvList(z.enum(AuditAction)),
  actorId: z.string().min(1).max(64).optional(),
  ticketNumber: z.coerce.number().int().positive().optional(),
});
export type ListAuditQuery = z.infer<typeof listAuditQuerySchema>;

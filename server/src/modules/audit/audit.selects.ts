import type { Prisma } from '../../lib/prisma';
import { userRefSelect } from '../users/user.selects';

export const auditEntrySelect = {
  id: true,
  ticketId: true,
  action: true,
  fromValue: true,
  toValue: true,
  metadata: true,
  createdAt: true,
  actor: { select: userRefSelect },
  ticket: { select: { number: true, title: true } },
} satisfies Prisma.AuditLogSelect;
export type AuditEntry = Prisma.AuditLogGetPayload<{ select: typeof auditEntrySelect }>;

import { isStaffRole } from '../../domain/enums';
import { NotFoundError } from '../../lib/errors';
import type { DbClient, Prisma } from '../../lib/prisma';
import type { AuthUser } from '../auth/auth.types';

/** The minimum a command needs to know about a ticket before changing it. */
export const ticketCoreSelect = {
  id: true,
  number: true,
  title: true,
  status: true,
  priority: true,
  category: true,
  requesterId: true,
  assigneeId: true,
  slaDueAt: true,
  firstResponseAt: true,
  createdAt: true,
  assignee: { select: { name: true } },
} satisfies Prisma.TicketSelect;
export type TicketCore = Prisma.TicketGetPayload<{ select: typeof ticketCoreSelect }>;

/** Staff see every ticket; customers only their own. */
export function canViewTicket(actor: AuthUser, ticket: { requesterId: string }): boolean {
  return isStaffRole(actor.role) || ticket.requesterId === actor.id;
}

/**
 * Loads a ticket the actor is allowed to see. "Does not exist" and "not yours" are
 * deliberately indistinguishable (both 404) so ticket ids cannot be probed.
 */
export async function loadTicketCore(db: DbClient, actor: AuthUser, id: string): Promise<TicketCore> {
  const ticket = await db.ticket.findUnique({ where: { id }, select: ticketCoreSelect });
  if (!ticket || !canViewTicket(actor, ticket)) throw new NotFoundError('Ticket not found');
  return ticket;
}

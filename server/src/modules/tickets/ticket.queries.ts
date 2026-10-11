import { isStaffRole, type TicketStatus } from '../../domain/enums';
import { NotFoundError } from '../../lib/errors';
import { buildPage, type Page } from '../../lib/http';
import { prisma, type Prisma } from '../../lib/prisma';
import type { AuthUser } from '../auth/auth.types';
import { canViewTicket } from './ticket.core';
import type { ListTicketsQuery, TicketSort } from './ticket.schemas';
import {
  messageSelect,
  ticketDetailSelect,
  ticketSummarySelect,
  type TicketMessageDto,
  type TicketRecord,
  type TicketSummary,
} from './ticket.selects';
import { allowedTransitionsFor } from './ticket.state-machine';

const ORDER_BY: Record<TicketSort, Prisma.TicketOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }, { id: 'desc' }],
  oldest: [{ createdAt: 'asc' }, { id: 'asc' }],
  updated: [{ updatedAt: 'desc' }, { id: 'desc' }],
  // Enum order is LOW < MEDIUM < HIGH < CRITICAL, so DESC puts the most urgent first.
  priority: [{ priority: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
};

const TICKET_NUMBER = /^(?:itsm-|#)?(\d{1,9})$/i;

function searchFilter(q: string): Prisma.TicketWhereInput {
  const title: Prisma.TicketWhereInput = { title: { contains: q, mode: 'insensitive' } };
  const match = TICKET_NUMBER.exec(q);
  return match?.[1] ? { OR: [{ number: Number(match[1]) }, title] } : title;
}

function assigneeFilter(
  actor: AuthUser,
  assignee: string | undefined,
): Prisma.TicketWhereInput {
  if (!assignee) return {};
  if (assignee === 'me') return { assigneeId: actor.id };
  if (assignee === 'unassigned') return { assigneeId: null };
  return { assigneeId: assignee };
}

/** Paginated, filtered ticket list. Customers are always scoped to their own tickets. */
export async function listTickets(
  actor: AuthUser,
  query: ListTicketsQuery,
): Promise<Page<TicketSummary>> {
  const staff = isStaffRole(actor.role);

  const where: Prisma.TicketWhereInput = {
    ...(staff ? assigneeFilter(actor, query.assignee) : { requesterId: actor.id }),
    ...(query.status?.length ? { status: { in: query.status } } : {}),
    ...(query.priority?.length ? { priority: { in: query.priority } } : {}),
    ...(query.category?.length ? { category: { in: query.category } } : {}),
    ...(query.q ? searchFilter(query.q) : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy: ORDER_BY[query.sort],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: ticketSummarySelect,
    }),
    prisma.ticket.count({ where }),
  ]);

  return buildPage(items, total, query.page, query.pageSize);
}

export interface TicketDetail extends TicketRecord {
  messages: TicketMessageDto[];
  /** Status changes the current user may make right now (drives the action buttons). */
  allowedTransitions: TicketStatus[];
}

const MAX_MESSAGES = 500;

export async function getTicketDetail(actor: AuthUser, ticketId: string): Promise<TicketDetail> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: ticketDetailSelect,
  });
  if (!ticket || !canViewTicket(actor, ticket)) throw new NotFoundError('Ticket not found');

  // Internal notes never leave the staff side.
  const messages = await prisma.ticketMessage.findMany({
    where: { ticketId, ...(isStaffRole(actor.role) ? {} : { isInternal: false }) },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    take: MAX_MESSAGES,
    select: messageSelect,
  });

  return {
    ...ticket,
    messages,
    allowedTransitions: allowedTransitionsFor(actor.role, ticket.status),
  };
}

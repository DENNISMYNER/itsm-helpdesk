import type { Prisma } from '../../lib/prisma';
import { userRefSelect } from '../users/user.selects';

/** Fields shown in lists, boards and realtime payloads (no long text). */
export const ticketSummarySelect = {
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
  resolvedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  requester: { select: userRefSelect },
  assignee: { select: userRefSelect },
} satisfies Prisma.TicketSelect;
export type TicketSummary = Prisma.TicketGetPayload<{ select: typeof ticketSummarySelect }>;

export const ticketDetailSelect = {
  ...ticketSummarySelect,
  description: true,
} satisfies Prisma.TicketSelect;
export type TicketRecord = Prisma.TicketGetPayload<{ select: typeof ticketDetailSelect }>;

export const messageSelect = {
  id: true,
  ticketId: true,
  body: true,
  isInternal: true,
  createdAt: true,
  author: { select: userRefSelect },
} satisfies Prisma.TicketMessageSelect;
export type TicketMessageDto = Prisma.TicketMessageGetPayload<{ select: typeof messageSelect }>;

import type { Request, Response } from 'express';
import { idParamSchema } from '../../lib/http';
import { prisma } from '../../lib/prisma';
import { getAuthUser } from '../../middleware/auth';
import { listTicketActivity } from '../audit/audit.service';
import {
  assignTicket,
  changeTicketPriority,
  changeTicketStatus,
  createTicket,
} from './ticket.commands';
import { loadTicketCore } from './ticket.core';
import { getTicketDetail, listTickets } from './ticket.queries';
import {
  assignTicketSchema,
  changePrioritySchema,
  changeStatusSchema,
  createTicketSchema,
  listTicketsQuerySchema,
} from './ticket.schemas';

export async function listTicketsHandler(req: Request, res: Response): Promise<void> {
  const actor = getAuthUser(req);
  const query = listTicketsQuerySchema.parse(req.query);
  res.json(await listTickets(actor, query));
}

export async function createTicketHandler(req: Request, res: Response): Promise<void> {
  const actor = getAuthUser(req);
  const input = createTicketSchema.parse(req.body);
  res.status(201).json({ ticket: await createTicket(actor, input) });
}

export async function getTicketHandler(req: Request, res: Response): Promise<void> {
  const actor = getAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  res.json({ ticket: await getTicketDetail(actor, id) });
}

export async function changeStatusHandler(req: Request, res: Response): Promise<void> {
  const actor = getAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  const { status } = changeStatusSchema.parse(req.body);
  await changeTicketStatus(actor, id, status);
  res.json({ ticket: await getTicketDetail(actor, id) });
}

export async function assignHandler(req: Request, res: Response): Promise<void> {
  const actor = getAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  const { assigneeId } = assignTicketSchema.parse(req.body);
  await assignTicket(actor, id, assigneeId);
  res.json({ ticket: await getTicketDetail(actor, id) });
}

export async function changePriorityHandler(req: Request, res: Response): Promise<void> {
  const actor = getAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  const { priority } = changePrioritySchema.parse(req.body);
  await changeTicketPriority(actor, id, priority);
  res.json({ ticket: await getTicketDetail(actor, id) });
}

export async function listActivityHandler(req: Request, res: Response): Promise<void> {
  const actor = getAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  await loadTicketCore(prisma, actor, id); // 404s for unknown tickets
  res.json({ items: await listTicketActivity(id) });
}

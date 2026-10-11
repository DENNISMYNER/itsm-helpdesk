import { Router } from 'express';
import { Role } from '../../domain/enums';
import { authenticate, requireRole } from '../../middleware/auth';
import { postMessageHandler } from '../messages/message.controller';
import {
  assignHandler,
  changePriorityHandler,
  changeStatusHandler,
  createTicketHandler,
  getTicketHandler,
  listActivityHandler,
  listTicketsHandler,
} from './ticket.controller';

export const ticketRouter = Router();

ticketRouter.use(authenticate);

ticketRouter.get('/', listTicketsHandler);
ticketRouter.post('/', createTicketHandler);
ticketRouter.get('/:id', getTicketHandler);

// Customers may only use the transitions the state machine grants them (checked in the service).
ticketRouter.patch('/:id/status', changeStatusHandler);

// Queue management is staff-only.
ticketRouter.patch('/:id/assignee', requireRole(Role.AGENT, Role.ADMIN), assignHandler);
ticketRouter.patch('/:id/priority', requireRole(Role.AGENT, Role.ADMIN), changePriorityHandler);
ticketRouter.get('/:id/activity', requireRole(Role.AGENT, Role.ADMIN), listActivityHandler);

ticketRouter.post('/:id/messages', postMessageHandler);

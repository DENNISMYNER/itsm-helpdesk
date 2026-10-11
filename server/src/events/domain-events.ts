import type { AuditEntry } from '../modules/audit/audit.selects';
import type { NotificationDto } from '../modules/notifications/notification.selects';
import type { TicketMessageDto, TicketSummary } from '../modules/tickets/ticket.selects';

export type TicketChange = 'status' | 'assignment' | 'priority';

/**
 * Facts about things that already happened (and were committed).
 * Services publish them; the realtime gateway turns them into Socket.io pushes.
 * Keeping the two decoupled means business code never imports Socket.io.
 */
export type DomainEvent =
  | { type: 'ticket.created'; ticket: TicketSummary }
  | { type: 'ticket.updated'; ticket: TicketSummary; change: TicketChange }
  | { type: 'message.created'; ticketId: string; message: TicketMessageDto }
  | { type: 'activity.created'; entry: AuditEntry }
  | { type: 'notification.created'; userId: string; notification: NotificationDto };

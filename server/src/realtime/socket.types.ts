import type { Server, Socket } from 'socket.io';
import type { TicketChange } from '../events/domain-events';
import type { AuditEntry } from '../modules/audit/audit.selects';
import type { AuthUser } from '../modules/auth/auth.types';
import type { NotificationDto } from '../modules/notifications/notification.selects';
import type { TicketMessageDto, TicketSummary } from '../modules/tickets/ticket.selects';

export type AckResponse = { ok: true } | { ok: false; error: string };

export interface TypingPayload {
  ticketId: string;
  userId: string;
  name: string;
  isTyping: boolean;
}

/** Events the server pushes to browsers. */
export interface ServerToClientEvents {
  'ticket:created': (ticket: TicketSummary) => void;
  'ticket:updated': (payload: { ticket: TicketSummary; change: TicketChange }) => void;
  'message:new': (payload: { ticketId: string; message: TicketMessageDto }) => void;
  'activity:new': (entry: AuditEntry) => void;
  'notification:new': (notification: NotificationDto) => void;
  'ticket:typing': (payload: TypingPayload) => void;
}

/** Events browsers may send. Payloads are `unknown` and validated with zod on arrival. */
export interface ClientToServerEvents {
  'ticket:join': (payload: unknown, ack?: (response: AckResponse) => void) => void;
  'ticket:leave': (payload: unknown) => void;
  'ticket:typing': (payload: unknown) => void;
}

export type InterServerEvents = Record<string, never>;

export interface SocketData {
  user: AuthUser;
}

export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

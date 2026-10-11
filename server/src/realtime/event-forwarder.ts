import type { DomainEvent } from '../events/domain-events';
import { rooms } from './rooms';
import type { AppServer } from './socket.types';

function assertNever(value: never): never {
  throw new Error(`Unhandled domain event: ${JSON.stringify(value)}`);
}

/**
 * Translates committed domain events into Socket.io pushes. This is the only bridge between
 * business code and the realtime transport.
 *
 * Emitting to several rooms at once delivers the event once per socket, even when that socket
 * belongs to more than one of them.
 */
export function forwardDomainEvent(io: AppServer, event: DomainEvent): void {
  switch (event.type) {
    case 'ticket.created':
      io.to([rooms.staff, rooms.user(event.ticket.requesterId)]).emit('ticket:created', event.ticket);
      return;

    case 'ticket.updated':
      io.to([
        rooms.staff,
        rooms.user(event.ticket.requesterId),
        rooms.ticket(event.ticket.id),
      ]).emit('ticket:updated', { ticket: event.ticket, change: event.change });
      return;

    case 'message.created': {
      // Internal notes only ever go to the staff room of that ticket.
      const room = event.message.isInternal
        ? rooms.ticketStaff(event.ticketId)
        : rooms.ticket(event.ticketId);
      io.to(room).emit('message:new', { ticketId: event.ticketId, message: event.message });
      return;
    }

    case 'activity.created':
      io.to(rooms.ticketStaff(event.entry.ticketId)).emit('activity:new', event.entry);
      return;

    case 'notification.created':
      io.to(rooms.user(event.userId)).emit('notification:new', event.notification);
      return;

    default:
      assertNever(event);
  }
}

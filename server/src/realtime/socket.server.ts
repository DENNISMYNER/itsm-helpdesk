import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { z } from 'zod';
import { env } from '../config/env';
import { isStaffRole } from '../domain/enums';
import { eventBus } from '../events/event-bus';
import { AppError, NotFoundError } from '../lib/errors';
import { logger } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { canViewTicket } from '../modules/tickets/ticket.core';
import { forwardDomainEvent } from './event-forwarder';
import { rooms } from './rooms';
import { authenticateSocket } from './socket.auth';
import type { AppServer, AppSocket } from './socket.types';

const ticketPayload = z.object({ ticketId: z.string().min(1).max(64) });
const typingPayload = ticketPayload.extend({ isTyping: z.boolean() });

export interface RealtimeServer {
  io: AppServer;
  close: () => Promise<void>;
}

async function joinTicketRooms(socket: AppSocket, ticketId: string): Promise<void> {
  const { user } = socket.data;
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { requesterId: true },
  });
  if (!ticket || !canViewTicket(user, ticket)) throw new NotFoundError('Ticket not found');

  await socket.join(rooms.ticket(ticketId));
  if (isStaffRole(user.role)) await socket.join(rooms.ticketStaff(ticketId));
}

function registerHandlers(socket: AppSocket): void {
  const { user } = socket.data;

  socket.on('ticket:join', (payload, ack) => {
    const parsed = ticketPayload.safeParse(payload);
    if (!parsed.success) {
      ack?.({ ok: false, error: 'Invalid ticket id' });
      return;
    }
    joinTicketRooms(socket, parsed.data.ticketId).then(
      () => ack?.({ ok: true }),
      (error: unknown) => {
        if (!(error instanceof AppError)) logger.error({ err: error }, 'Socket join failed');
        ack?.({ ok: false, error: error instanceof AppError ? error.message : 'Unable to join' });
      },
    );
  });

  socket.on('ticket:leave', (payload) => {
    const parsed = ticketPayload.safeParse(payload);
    if (!parsed.success) return;
    const { ticketId } = parsed.data;
    for (const room of [rooms.ticket(ticketId), rooms.ticketStaff(ticketId)]) {
      Promise.resolve(socket.leave(room)).catch((error: unknown) =>
        logger.error({ err: error }, 'Socket leave failed'),
      );
    }
  });

  socket.on('ticket:typing', (payload) => {
    const parsed = typingPayload.safeParse(payload);
    if (!parsed.success) return;
    const { ticketId, isTyping } = parsed.data;
    // Only sockets that were authorised to join the ticket may signal typing in it.
    if (!socket.rooms.has(rooms.ticket(ticketId))) return;
    socket.to(rooms.ticket(ticketId)).emit('ticket:typing', {
      ticketId,
      userId: user.id,
      name: user.name,
      isTyping,
    });
  });

  // Make sure nobody is left "typing" forever when a tab closes mid-sentence.
  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (!room.startsWith('ticket:') || room.endsWith(':staff')) continue;
      socket.to(room).emit('ticket:typing', {
        ticketId: room.slice('ticket:'.length),
        userId: user.id,
        name: user.name,
        isTyping: false,
      });
    }
  });
}

/** Attaches Socket.io to the HTTP server and bridges domain events to connected clients. */
export function createRealtimeServer(httpServer: HttpServer): RealtimeServer {
  const io: AppServer = new Server(httpServer, {
    cors: { origin: env.CLIENT_ORIGIN, credentials: true },
  });

  io.use((socket, next) => {
    authenticateSocket(socket).then(
      (user) => {
        socket.data.user = user;
        next();
      },
      () => next(new Error('UNAUTHORIZED')),
    );
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    const joins = [socket.join(rooms.user(user.id))];
    if (isStaffRole(user.role)) joins.push(socket.join(rooms.staff));

    Promise.all(joins)
      .then(() => registerHandlers(socket))
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Socket connection setup failed');
        socket.disconnect(true);
      });
  });

  const unsubscribe = eventBus.subscribe((event) => forwardDomainEvent(io, event));

  return {
    io,
    close: async () => {
      unsubscribe();
      await io.close(); // also closes the underlying HTTP server
    },
  };
}

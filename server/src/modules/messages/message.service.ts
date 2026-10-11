import { AuditAction, NotificationType, TicketStatus, isStaffRole } from '../../domain/enums';
import { ConflictError, ForbiddenError } from '../../lib/errors';
import type { AuthUser } from '../auth/auth.types';
import { queueNotification } from '../notifications/notification.service';
import { logActivity } from '../tickets/ticket.activity';
import { runCommand } from '../tickets/ticket.command-runner';
import { loadTicketCore } from '../tickets/ticket.core';
import { ticketRef } from '../tickets/ticket.labels';
import { messageSelect, type TicketMessageDto } from '../tickets/ticket.selects';
import { applyStatusChange } from '../tickets/ticket.transition';
import type { PostMessageInput } from './message.schemas';

const excerpt = (text: string): string => (text.length > 120 ? `${text.slice(0, 117)}...` : text);

/**
 * Adds a chat message or an internal note to a ticket.
 *
 * Side effects, all in the same transaction:
 *  - staff public reply  : stamps first-response time, moves OPEN -> IN_PROGRESS, notifies the requester
 *  - customer reply      : moves WAITING_ON_CUSTOMER / RESOLVED -> IN_PROGRESS, notifies the assignee
 *  - internal note       : written to the audit trail, never sent to the customer
 */
export function postMessage(
  actor: AuthUser,
  ticketId: string,
  input: PostMessageInput,
): Promise<TicketMessageDto> {
  return runCommand(actor, async (ctx) => {
    const { tx, events } = ctx;
    const ticket = await loadTicketCore(tx, actor, ticketId);
    const staff = isStaffRole(actor.role);

    if (input.isInternal && !staff) {
      throw new ForbiddenError('Only staff can add internal notes');
    }
    if (ticket.status === TicketStatus.CLOSED) {
      throw new ConflictError(
        'This ticket is closed. Open a new ticket if you still need help.',
        'TICKET_CLOSED',
      );
    }

    const message = await tx.ticketMessage.create({
      data: { ticketId: ticket.id, authorId: actor.id, body: input.body, isInternal: input.isInternal },
      select: messageSelect,
    });
    events.push({ type: 'message.created', ticketId: ticket.id, message });

    if (input.isInternal) {
      await logActivity(ctx, {
        ticketId: ticket.id,
        actorId: actor.id,
        action: AuditAction.NOTE_ADDED,
        metadata: { messageId: message.id },
      });
      return message;
    }

    if (staff) {
      await tx.ticket.updateMany({
        where: { id: ticket.id, firstResponseAt: null },
        data: { firstResponseAt: new Date() },
      });
      if (ticket.status === TicketStatus.OPEN) {
        await applyStatusChange(ctx, ticket, TicketStatus.IN_PROGRESS, {
          system: true,
          reason: 'First reply from support',
        });
      }
      if (ticket.requesterId !== actor.id) {
        await queueNotification(tx, events, {
          userId: ticket.requesterId,
          ticketId: ticket.id,
          type: NotificationType.NEW_MESSAGE,
          title: `New reply on ${ticketRef(ticket.number)}`,
          body: excerpt(input.body),
        });
      }
    } else {
      if (ticket.status === TicketStatus.WAITING_ON_CUSTOMER || ticket.status === TicketStatus.RESOLVED) {
        await applyStatusChange(ctx, ticket, TicketStatus.IN_PROGRESS, {
          system: true,
          reason:
            ticket.status === TicketStatus.RESOLVED
              ? 'Customer replied after resolution'
              : 'Customer replied',
        });
      }
      if (ticket.assigneeId !== null && ticket.assigneeId !== actor.id) {
        await queueNotification(tx, events, {
          userId: ticket.assigneeId,
          ticketId: ticket.id,
          type: NotificationType.NEW_MESSAGE,
          title: `${ticketRef(ticket.number)}: customer replied`,
          body: excerpt(input.body),
        });
      }
    }

    return message;
  });
}

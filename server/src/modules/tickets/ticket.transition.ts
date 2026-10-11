import { AuditAction, NotificationType, TicketStatus, isStaffRole } from '../../domain/enums';
import { ConflictError } from '../../lib/errors';
import type { Prisma } from '../../lib/prisma';
import type { AuditMetadata } from '../audit/audit.service';
import { queueNotification } from '../notifications/notification.service';
import { logActivity, queueTicketUpdate } from './ticket.activity';
import type { CommandContext } from './ticket.command-runner';
import type { TicketCore } from './ticket.core';
import { STATUS_LABEL, ticketRef } from './ticket.labels';
import { assertTransition, lifecycleTimestamps } from './ticket.state-machine';

export interface TransitionOptions {
  /** True for automatic moves (e.g. the customer replied); skips the role check, not the machine. */
  system?: boolean;
  /** Short human-readable cause, stored in the audit trail. */
  reason?: string;
}

/**
 * The single place a ticket's status changes. Enforces the state machine, claims
 * unassigned tickets for the staff member who starts work, stamps lifecycle timestamps,
 * writes the audit trail and queues notifications - all inside the caller's transaction.
 *
 * The UPDATE is conditional on the status we read, so two agents racing on the same
 * ticket cannot both win; the loser gets a 409 and a database trigger backs this up.
 */
export async function applyStatusChange(
  ctx: CommandContext,
  ticket: TicketCore,
  to: TicketStatus,
  options: TransitionOptions = {},
): Promise<void> {
  const { tx, actor, events } = ctx;
  const system = options.system === true;

  if (ticket.status === to) {
    throw new ConflictError(
      `This ticket is already ${STATUS_LABEL[to].toLowerCase()}`,
      'STATUS_UNCHANGED',
    );
  }
  assertTransition(actor.role, ticket.status, to, { system });

  const claims =
    isStaffRole(actor.role) && ticket.assigneeId === null && to === TicketStatus.IN_PROGRESS;

  const data: Prisma.TicketUncheckedUpdateManyInput = {
    status: to,
    ...lifecycleTimestamps(ticket.status, to, new Date()),
    ...(claims ? { assigneeId: actor.id } : {}),
  };
  const { count } = await tx.ticket.updateMany({
    where: { id: ticket.id, status: ticket.status },
    data,
  });
  if (count === 0) {
    throw new ConflictError(
      'This ticket was changed by someone else. Refresh and try again.',
      'STALE_TICKET',
    );
  }

  const metadata: AuditMetadata = {
    ...(system ? { automatic: true } : {}),
    ...(options.reason ? { reason: options.reason } : {}),
  };
  await logActivity(ctx, {
    ticketId: ticket.id,
    actorId: actor.id,
    action: AuditAction.STATUS_CHANGED,
    fromValue: ticket.status,
    toValue: to,
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
  });

  if (claims) {
    await logActivity(ctx, {
      ticketId: ticket.id,
      actorId: actor.id,
      action: AuditAction.ASSIGNED,
      fromValue: null,
      toValue: actor.id,
      metadata: { assigneeName: actor.name, claimed: true },
    });
  }

  // Tell the other party. Automatic moves are already announced by the message that caused them.
  if (!system) {
    const recipientId =
      actor.id !== ticket.requesterId ? ticket.requesterId : (ticket.assigneeId ?? null);
    if (recipientId !== null && recipientId !== actor.id) {
      await queueNotification(tx, events, {
        userId: recipientId,
        ticketId: ticket.id,
        type: NotificationType.STATUS_CHANGED,
        title: `${ticketRef(ticket.number)} is now ${STATUS_LABEL[to].toLowerCase()}`,
        body: ticket.title,
      });
    }
  }

  await queueTicketUpdate(ctx, ticket.id, 'status');
}

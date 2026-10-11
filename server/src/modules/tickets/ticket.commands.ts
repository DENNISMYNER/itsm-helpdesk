import { AuditAction, NotificationType, Role, TicketStatus } from '../../domain/enums';
import type { TicketPriority } from '../../domain/enums';
import { BadRequestError, ConflictError } from '../../lib/errors';
import type { AuditMetadata } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth.types';
import { queueNotification } from '../notifications/notification.service';
import { resolveInitialPriority } from '../routing/priority-escalation';
import { lockAssignmentQueue, routeNewTicket } from '../routing/routing.service';
import { logActivity, queueTicketUpdate } from './ticket.activity';
import { runCommand } from './ticket.command-runner';
import { loadTicketCore } from './ticket.core';
import { ticketRef } from './ticket.labels';
import type { CreateTicketInput } from './ticket.schemas';
import { ticketSummarySelect, type TicketSummary } from './ticket.selects';
import { computeSlaDueAt } from './ticket.sla';
import { applyStatusChange } from './ticket.transition';

/**
 * Creates a ticket, applies priority escalation, routes it to an agent and records
 * everything in one transaction. The advisory lock makes routing decisions race-free.
 */
export function createTicket(actor: AuthUser, input: CreateTicketInput): Promise<TicketSummary> {
  const initial = resolveInitialPriority(actor.role, input.priority, input.title, input.description);

  return runCommand(actor, async (ctx) => {
    const { tx, events } = ctx;
    await lockAssignmentQueue(tx);

    const decision = await routeNewTicket(tx, {
      category: input.category,
      priority: initial.priority,
    });

    const now = new Date();
    const ticket = await tx.ticket.create({
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        priority: initial.priority,
        requesterId: actor.id,
        assigneeId: decision?.agentId ?? null,
        slaDueAt: computeSlaDueAt(initial.priority, now),
        createdAt: now,
      },
      select: ticketSummarySelect,
    });

    const createdMetadata: AuditMetadata = {
      priority: initial.priority,
      category: input.category,
      ...(initial.escalated
        ? { escalatedFrom: initial.requested, escalationReason: initial.reason }
        : {}),
    };
    await logActivity(ctx, {
      ticketId: ticket.id,
      actorId: actor.id,
      action: AuditAction.TICKET_CREATED,
      toValue: TicketStatus.OPEN,
      metadata: createdMetadata,
    });

    if (decision) {
      await logActivity(ctx, {
        ticketId: ticket.id,
        actorId: null, // performed by the routing engine, not a person
        action: AuditAction.ASSIGNED,
        fromValue: null,
        toValue: decision.agentId,
        metadata: {
          assigneeName: decision.agentName,
          automatic: true,
          ruleId: decision.ruleId,
          strategy: decision.strategy,
          skillMatched: decision.skillMatched,
        },
      });
      if (decision.agentId !== actor.id) {
        await queueNotification(tx, events, {
          userId: decision.agentId,
          ticketId: ticket.id,
          type: NotificationType.TICKET_ASSIGNED,
          title: `${ticketRef(ticket.number)} was assigned to you`,
          body: ticket.title,
        });
      }
    }

    events.push({ type: 'ticket.created', ticket });
    return ticket;
  });
}

export function changeTicketStatus(
  actor: AuthUser,
  ticketId: string,
  to: TicketStatus,
): Promise<void> {
  return runCommand(actor, async (ctx) => {
    const ticket = await loadTicketCore(ctx.tx, actor, ticketId);
    await applyStatusChange(ctx, ticket, to);
  });
}

/** Assigns (or, with `null`, unassigns) a ticket. Staff only - enforced at the route. */
export function assignTicket(
  actor: AuthUser,
  ticketId: string,
  assigneeId: string | null,
): Promise<void> {
  return runCommand(actor, async (ctx) => {
    const { tx, events } = ctx;
    const ticket = await loadTicketCore(tx, actor, ticketId);

    if (ticket.status === TicketStatus.CLOSED) {
      throw new ConflictError('Closed tickets cannot be reassigned', 'TICKET_CLOSED');
    }
    if (assigneeId === ticket.assigneeId) return; // nothing to do

    let assigneeName: string | null = null;
    if (assigneeId !== null) {
      const target = await tx.user.findFirst({
        where: { id: assigneeId, isActive: true, role: { in: [Role.AGENT, Role.ADMIN] } },
        select: { name: true },
      });
      if (!target) {
        throw new BadRequestError('Assignee must be an active agent or admin', 'INVALID_ASSIGNEE');
      }
      assigneeName = target.name;
    }

    const { count } = await tx.ticket.updateMany({
      where: { id: ticket.id, assigneeId: ticket.assigneeId },
      data: { assigneeId },
    });
    if (count === 0) {
      throw new ConflictError(
        'This ticket was changed by someone else. Refresh and try again.',
        'STALE_TICKET',
      );
    }

    const action =
      ticket.assigneeId === null
        ? AuditAction.ASSIGNED
        : assigneeId === null
          ? AuditAction.UNASSIGNED
          : AuditAction.REASSIGNED;
    await logActivity(ctx, {
      ticketId: ticket.id,
      actorId: actor.id,
      action,
      fromValue: ticket.assigneeId,
      toValue: assigneeId,
      metadata: {
        ...(assigneeName ? { assigneeName } : {}),
        ...(ticket.assignee ? { previousAssigneeName: ticket.assignee.name } : {}),
      },
    });

    if (assigneeId !== null) {
      await tx.user.update({ where: { id: assigneeId }, data: { lastAssignedAt: new Date() } });
      if (assigneeId !== actor.id) {
        await queueNotification(tx, events, {
          userId: assigneeId,
          ticketId: ticket.id,
          type: NotificationType.TICKET_ASSIGNED,
          title: `${ticketRef(ticket.number)} was assigned to you`,
          body: ticket.title,
        });
      }
    }

    await queueTicketUpdate(ctx, ticket.id, 'assignment');
  });
}

/** Re-prioritises an active ticket and moves its SLA deadline accordingly. */
export function changeTicketPriority(
  actor: AuthUser,
  ticketId: string,
  priority: TicketPriority,
): Promise<void> {
  return runCommand(actor, async (ctx) => {
    const { tx } = ctx;
    const ticket = await loadTicketCore(tx, actor, ticketId);

    if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
      throw new ConflictError('Only active tickets can be re-prioritised', 'TICKET_NOT_ACTIVE');
    }
    if (priority === ticket.priority) return;

    const { count } = await tx.ticket.updateMany({
      where: { id: ticket.id, priority: ticket.priority },
      data: { priority, slaDueAt: computeSlaDueAt(priority, ticket.createdAt) },
    });
    if (count === 0) {
      throw new ConflictError(
        'This ticket was changed by someone else. Refresh and try again.',
        'STALE_TICKET',
      );
    }

    await logActivity(ctx, {
      ticketId: ticket.id,
      actorId: actor.id,
      action: AuditAction.PRIORITY_CHANGED,
      fromValue: ticket.priority,
      toValue: priority,
    });
    await queueTicketUpdate(ctx, ticket.id, 'priority');
  });
}

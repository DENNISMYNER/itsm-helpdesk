import type { TicketChange } from '../../events/domain-events';
import { recordAudit, type AuditInput } from '../audit/audit.service';
import type { CommandContext } from './ticket.command-runner';
import { ticketSummarySelect } from './ticket.selects';

/** Appends an audit entry (same transaction) and queues the live activity event. */
export async function logActivity(ctx: CommandContext, input: AuditInput): Promise<void> {
  const entry = await recordAudit(ctx.tx, input);
  ctx.events.push({ type: 'activity.created', entry });
}

/** Queues a `ticket.updated` event carrying the ticket as it is right now. */
export async function queueTicketUpdate(
  ctx: CommandContext,
  ticketId: string,
  change: TicketChange,
): Promise<void> {
  const ticket = await ctx.tx.ticket.findUniqueOrThrow({
    where: { id: ticketId },
    select: ticketSummarySelect,
  });
  ctx.events.push({ type: 'ticket.updated', ticket, change });
}

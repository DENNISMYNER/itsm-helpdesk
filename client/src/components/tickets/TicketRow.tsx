import { Link } from 'react-router';
import { cn } from '../../lib/cn';
import { timeAgo } from '../../lib/format';
import { CATEGORY_LABEL, ticketRef } from '../../lib/labels';
import type { TicketSummary } from '../../types/api';
import { Avatar } from '../ui/Avatar';
import { PRIORITY_STYLE, PriorityLabel, StatusBadge } from './badges';
import { SlaIndicator } from './SlaIndicator';

/** Shared grid so the header row and every ticket row line up. */
export const ROW_GRID = 'lg:grid lg:grid-cols-[6rem_minmax(0,1fr)_10.5rem_6.5rem_9.5rem_7.5rem] lg:items-center lg:gap-4';

interface Props {
  ticket: TicketSummary;
  now: number;
  staff: boolean;
  highlighted: boolean;
}

/**
 * One ticket. The coloured rail on the left edge is the priority, readable at a glance while
 * scanning a long queue; the label next to it repeats it in words and with an icon.
 */
export function TicketRow({ ticket, now, staff, highlighted }: Props) {
  const rail = PRIORITY_STYLE[ticket.priority].rail;
  return (
    <li className={cn('relative', highlighted && 'flash-once')}>
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', rail)} />
      <Link
        to={`/tickets/${ticket.id}`}
        className={cn('block py-3.5 pl-5 pr-4 hover:bg-subtle sm:pl-6 sm:pr-5', ROW_GRID)}
      >
        <span className="tabular hidden whitespace-nowrap text-sm font-medium text-muted lg:block">
          {ticketRef(ticket.number)}
        </span>

        <span className="block min-w-0">
          <span className="tabular mr-2 text-xs font-medium text-muted lg:hidden">{ticketRef(ticket.number)}</span>
          <span className="font-semibold">{ticket.title}</span>
          <span className="mt-0.5 block truncate text-sm text-muted">
            {staff ? `${ticket.requester.name} · ` : ''}
            {CATEGORY_LABEL[ticket.category]} · updated {timeAgo(ticket.updatedAt, now)}
          </span>
        </span>

        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 lg:contents">
          <StatusBadge status={ticket.status} className="justify-self-start" />
          <PriorityLabel priority={ticket.priority} />
          <span className="flex min-w-0 items-center gap-2 text-sm">
            {ticket.assignee ? (
              <>
                <Avatar name={ticket.assignee.name} className="size-6 text-[10px]" />
                <span className="truncate">{ticket.assignee.name}</span>
              </>
            ) : (
              <span className="text-faint">Unassigned</span>
            )}
          </span>
          <SlaIndicator ticket={ticket} now={now} className="w-full lg:w-auto" />
        </span>
      </Link>
    </li>
  );
}

export function TicketListHeader() {
  return (
    <div
      aria-hidden
      className={cn('hidden border-b border-line bg-subtle/60 py-2 pl-6 pr-5 text-xs font-semibold text-muted', ROW_GRID)}
    >
      <span>Ref</span>
      <span>Ticket</span>
      <span>Status</span>
      <span>Priority</span>
      <span>Assigned to</span>
      <span>SLA</span>
    </div>
  );
}

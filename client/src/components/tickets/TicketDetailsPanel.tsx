import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { usersApi } from '../../api/admin.api';
import { useNow } from '../../hooks/useNow';
import { formatDateTime } from '../../lib/format';
import { CATEGORY_LABEL, PRIORITY_LABEL } from '../../lib/labels';
import { queryKeys } from '../../lib/query-keys';
import { TICKET_PRIORITIES, type TicketDetail, type TicketPriority } from '../../types/api';
import { Avatar } from '../ui/Avatar';
import { controlClass } from '../ui/Field';
import { PriorityLabel } from './badges';
import { SlaIndicator } from './SlaIndicator';

interface Props {
  ticket: TicketDetail;
  staff: boolean;
  onAssign: (assigneeId: string | null) => void;
  onPriority: (priority: TicketPriority) => void;
  busy: boolean;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function TicketDetailsPanel({ ticket, staff, onAssign, onPriority, busy }: Props) {
  const now = useNow();
  const closedForChanges = ticket.status === 'CLOSED';
  const priorityLocked = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';

  const staffList = useQuery({
    queryKey: queryKeys.staff,
    queryFn: usersApi.staff,
    enabled: staff,
    staleTime: 60_000,
  });

  return (
    <dl className="space-y-5 px-4 py-5 sm:px-5">
      <Row label="Requested by">
        <span className="flex items-center gap-2">
          <Avatar name={ticket.requester.name} className="size-6 text-[10px]" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{ticket.requester.name}</span>
            {staff ? <span className="block truncate text-xs text-muted">{ticket.requester.email}</span> : null}
          </span>
        </span>
      </Row>

      <Row label="Assigned to">
        {staff ? (
          <select
            aria-label="Assigned to"
            value={ticket.assigneeId ?? ''}
            disabled={busy || closedForChanges}
            onChange={(event) => onAssign(event.target.value || null)}
            className={`${controlClass} h-9`}
          >
            <option value="">Unassigned</option>
            {(staffList.data ?? []).map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        ) : ticket.assignee ? (
          <span className="flex items-center gap-2">
            <Avatar name={ticket.assignee.name} className="size-6 text-[10px]" />
            {ticket.assignee.name}
          </span>
        ) : (
          <span className="text-muted">Waiting for an agent</span>
        )}
      </Row>

      <Row label="Priority">
        {staff && !priorityLocked ? (
          <select
            aria-label="Priority"
            value={ticket.priority}
            disabled={busy}
            onChange={(event) => onPriority(event.target.value as TicketPriority)}
            className={`${controlClass} h-9`}
          >
            {TICKET_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABEL[priority]}
              </option>
            ))}
          </select>
        ) : (
          <PriorityLabel priority={ticket.priority} />
        )}
      </Row>

      <Row label="Category">{CATEGORY_LABEL[ticket.category]}</Row>

      <Row label="Response target">
        <SlaIndicator ticket={ticket} now={now} />
        <span className="mt-1 block text-xs text-muted">Due {formatDateTime(ticket.slaDueAt)}</span>
      </Row>

      <Row label="Opened">{formatDateTime(ticket.createdAt)}</Row>
      {ticket.resolvedAt ? <Row label="Resolved">{formatDateTime(ticket.resolvedAt)}</Row> : null}
    </dl>
  );
}

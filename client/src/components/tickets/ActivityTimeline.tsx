import {
  ArrowRightLeft,
  CirclePlus,
  Flag,
  StickyNote,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { formatDateTime } from '../../lib/format';
import { ACTION_LABEL, PRIORITY_LABEL, STATUS_LABEL } from '../../lib/labels';
import type { AuditAction, AuditEntry, TicketPriority, TicketStatus } from '../../types/api';

const ICON: Record<AuditAction, LucideIcon> = {
  TICKET_CREATED: CirclePlus,
  STATUS_CHANGED: ArrowRightLeft,
  ASSIGNED: UserPlus,
  REASSIGNED: UserPlus,
  UNASSIGNED: UserMinus,
  PRIORITY_CHANGED: Flag,
  NOTE_ADDED: StickyNote,
};

const statusText = (value: string | null): string =>
  value && value in STATUS_LABEL ? STATUS_LABEL[value as TicketStatus] : (value ?? '-');
const priorityText = (value: string | null): string =>
  value && value in PRIORITY_LABEL ? PRIORITY_LABEL[value as TicketPriority] : (value ?? '-');

/** One human-readable sentence per audit entry. */
export function describeEntry(entry: AuditEntry): string {
  const meta = entry.metadata ?? {};
  const by = entry.actor ? entry.actor.name : 'The routing engine';
  const assignee = typeof meta.assigneeName === 'string' ? meta.assigneeName : 'an agent';

  switch (entry.action) {
    case 'TICKET_CREATED':
      return typeof meta.escalationReason === 'string'
        ? `${by} opened the ticket; priority was raised automatically (${meta.escalationReason})`
        : `${by} opened the ticket`;
    case 'STATUS_CHANGED': {
      const automatic = meta.automatic === true ? ' automatically' : '';
      const reason = typeof meta.reason === 'string' ? ` (${meta.reason})` : '';
      return `${by} moved it${automatic} from ${statusText(entry.fromValue)} to ${statusText(entry.toValue)}${reason}`;
    }
    case 'ASSIGNED':
      return meta.automatic === true
        ? `Automatically assigned to ${assignee}${typeof meta.ruleId === 'string' ? ` (rule: ${meta.ruleId})` : ''}`
        : meta.claimed === true
          ? `${by} took the ticket`
          : `${by} assigned it to ${assignee}`;
    case 'REASSIGNED':
      return `${by} reassigned it to ${assignee}`;
    case 'UNASSIGNED':
      return `${by} removed the assignee`;
    case 'PRIORITY_CHANGED':
      return `${by} changed priority from ${priorityText(entry.fromValue)} to ${priorityText(entry.toValue)}`;
    case 'NOTE_ADDED':
      return `${by} added an internal note`;
  }
}

export function ActivityTimeline({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) return <p className="px-5 py-6 text-sm text-muted">No activity recorded yet.</p>;
  return (
    <ol className="space-y-4 px-4 py-5 sm:px-5">
      {entries.map((entry) => {
        const Icon = ICON[entry.action];
        return (
          <li key={entry.id} className="flex gap-3">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-subtle text-muted">
              <Icon aria-hidden className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm">{describeEntry(entry)}</p>
              <p className="text-xs text-muted">
                {ACTION_LABEL[entry.action]} · {formatDateTime(entry.createdAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

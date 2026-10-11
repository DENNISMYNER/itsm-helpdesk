import type { TicketStatus } from '../types/api';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const dateTime = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const dateOnly = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const dayMonth = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export const formatDateTime = (iso: string): string => dateTime.format(new Date(iso));
export const formatDate = (iso: string): string => dateOnly.format(new Date(iso));
/** Chart-axis date; the API buckets by UTC day so the label is rendered in UTC too. */
export const formatDayMonth = (isoDate: string): string => dayMonth.format(new Date(`${isoDate}T00:00:00Z`));

/** "5 minutes ago", "yesterday", "3 days ago"; falls back to a date after a month. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  if (abs < MINUTE) return 'just now';
  if (abs < HOUR) return relative.format(Math.round(diff / MINUTE), 'minute');
  if (abs < DAY) return relative.format(Math.round(diff / HOUR), 'hour');
  if (abs < 30 * DAY) return relative.format(Math.round(diff / DAY), 'day');
  return formatDate(iso);
}

/** "2h 15m", "3d 4h", "45m". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / MINUTE));
  const days = Math.floor(total / (24 * 60));
  const hours = Math.floor((total % (24 * 60)) / 60);
  const minutes = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatHours(hours: number | null): string {
  if (hours === null) return '-';
  return hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}h`;
}

export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '-';
  return minutes >= 120 ? `${(minutes / 60).toFixed(1)}h` : `${Math.round(minutes)}m`;
}

export const formatPercent = (ratio: number | null): string =>
  ratio === null ? '-' : `${Math.round(ratio * 100)}%`;

export type SlaState = 'on-track' | 'at-risk' | 'overdue' | 'met' | 'missed' | 'none';

export interface SlaInfo {
  state: SlaState;
  /** Short text such as "2h 15m left" or "overdue by 3h 5m". */
  label: string;
  /** Share of the allowed time already used (0-1, capped at 1). */
  elapsed: number;
}

/**
 * Where a ticket stands against its SLA deadline.
 * Finished tickets are judged on when they were resolved; active ones against `now`.
 */
export function slaInfo(
  ticket: { status: TicketStatus; createdAt: string; slaDueAt: string; resolvedAt: string | null },
  now: number = Date.now(),
): SlaInfo {
  const created = new Date(ticket.createdAt).getTime();
  const due = new Date(ticket.slaDueAt).getTime();
  const allowed = Math.max(1, due - created);

  if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
    if (!ticket.resolvedAt) return { state: 'none', label: '', elapsed: 0 };
    const resolved = new Date(ticket.resolvedAt).getTime();
    return resolved <= due
      ? { state: 'met', label: 'Resolved within SLA', elapsed: Math.min(1, (resolved - created) / allowed) }
      : { state: 'missed', label: `Resolved ${formatDuration(resolved - due)} late`, elapsed: 1 };
  }

  const elapsed = Math.min(1, Math.max(0, (now - created) / allowed));
  if (now > due) return { state: 'overdue', label: `Overdue by ${formatDuration(now - due)}`, elapsed: 1 };
  return {
    state: elapsed >= 0.75 ? 'at-risk' : 'on-track',
    label: `${formatDuration(due - now)} left`,
    elapsed,
  };
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

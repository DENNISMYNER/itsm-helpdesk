import type { TicketPriority } from '../../domain/enums';

/** Hours allowed to resolve a ticket, by priority. */
export const SLA_HOURS: Readonly<Record<TicketPriority, number>> = {
  CRITICAL: 4,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};

const MS_PER_HOUR = 60 * 60 * 1000;

export function computeSlaDueAt(priority: TicketPriority, createdAt: Date): Date {
  return new Date(createdAt.getTime() + SLA_HOURS[priority] * MS_PER_HOUR);
}

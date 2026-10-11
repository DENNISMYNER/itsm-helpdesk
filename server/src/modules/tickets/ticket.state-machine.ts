import { Role, TicketStatus, isStaffRole } from '../../domain/enums';
import { ForbiddenError, InvalidTransitionError } from '../../lib/errors';

/**
 * The ticket lifecycle:
 *
 *   OPEN -> IN_PROGRESS -> WAITING_ON_CUSTOMER -> RESOLVED -> CLOSED
 *
 * plus the legal "loops": work can resume after waiting on the customer, and a
 * resolved ticket can be re-opened. CLOSED is terminal.
 *
 * This table is mirrored in PostgreSQL (`ticket_status_transitions`, consulted by
 * a trigger). `assertStatusMachineInSync()` verifies both copies agree at start-up.
 */
export const TRANSITIONS: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['WAITING_ON_CUSTOMER', 'RESOLVED'],
  WAITING_ON_CUSTOMER: ['IN_PROGRESS', 'RESOLVED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
};

/** Moves a customer may make themselves (a subset of the state machine). */
const CUSTOMER_TRANSITIONS: Readonly<Partial<Record<TicketStatus, readonly TicketStatus[]>>> = {
  // Confirm the fix (close) or say "it is still broken" (re-open).
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
};

export function nextStatuses(from: TicketStatus): readonly TicketStatus[] {
  return TRANSITIONS[from];
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Transitions `role` may trigger manually from `from`. */
export function allowedTransitionsFor(role: Role, from: TicketStatus): TicketStatus[] {
  const valid = TRANSITIONS[from];
  if (isStaffRole(role)) return [...valid];
  const permitted = CUSTOMER_TRANSITIONS[from] ?? [];
  return valid.filter((status) => permitted.includes(status));
}

interface AssertOptions {
  /** System-driven moves (e.g. customer replied -> back to IN_PROGRESS) skip the role check. */
  system?: boolean;
}

/**
 * Throws InvalidTransitionError (422) when the edge does not exist in the machine,
 * or ForbiddenError (403) when the edge exists but `role` may not use it.
 */
export function assertTransition(
  role: Role,
  from: TicketStatus,
  to: TicketStatus,
  options: AssertOptions = {},
): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to, TRANSITIONS[from]);
  }
  if (!options.system && !allowedTransitionsFor(role, from).includes(to)) {
    throw new ForbiddenError(`Your role is not allowed to move a ticket from ${from} to ${to}`);
  }
}

export interface LifecycleTimestamps {
  resolvedAt?: Date | null;
  closedAt?: Date | null;
}

/** Timestamp columns that must change together with a status change. */
export function lifecycleTimestamps(
  from: TicketStatus,
  to: TicketStatus,
  now: Date,
): LifecycleTimestamps {
  if (to === TicketStatus.RESOLVED) return { resolvedAt: now };
  if (to === TicketStatus.CLOSED) return { closedAt: now };
  if (from === TicketStatus.RESOLVED) return { resolvedAt: null }; // re-opened
  return {};
}

/**
 * Domain vocabulary shared by every layer.
 *
 * These are declared by hand (instead of re-exported from the generated Prisma
 * client) so the pure business rules - state machine, routing, SLA - have zero
 * dependency on persistence and can be unit-tested in isolation.
 * `enums.check.ts` proves at compile time that they never drift from schema.prisma.
 */

export const Role = {
  CUSTOMER: 'CUSTOMER',
  AGENT: 'AGENT',
  ADMIN: 'ADMIN',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const TicketStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_ON_CUSTOMER: 'WAITING_ON_CUSTOMER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;
export type TicketPriority = (typeof TicketPriority)[keyof typeof TicketPriority];

export const TicketCategory = {
  HARDWARE: 'HARDWARE',
  SOFTWARE: 'SOFTWARE',
  NETWORK: 'NETWORK',
  ACCESS: 'ACCESS',
  EMAIL: 'EMAIL',
  SECURITY: 'SECURITY',
  OTHER: 'OTHER',
} as const;
export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const AuditAction = {
  TICKET_CREATED: 'TICKET_CREATED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  ASSIGNED: 'ASSIGNED',
  REASSIGNED: 'REASSIGNED',
  UNASSIGNED: 'UNASSIGNED',
  PRIORITY_CHANGED: 'PRIORITY_CHANGED',
  NOTE_ADDED: 'NOTE_ADDED',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export const NotificationType = {
  TICKET_ASSIGNED: 'TICKET_ASSIGNED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  NEW_MESSAGE: 'NEW_MESSAGE',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/** Ordered lowest -> highest; index doubles as a numeric rank. */
export const PRIORITY_ORDER: readonly TicketPriority[] = [
  TicketPriority.LOW,
  TicketPriority.MEDIUM,
  TicketPriority.HIGH,
  TicketPriority.CRITICAL,
];

/** Statuses in which a ticket still needs work. */
export const ACTIVE_STATUSES: readonly TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_ON_CUSTOMER,
];

export const isStaffRole = (role: Role): boolean => role === Role.AGENT || role === Role.ADMIN;

import type {
  AuditAction,
  Role,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../types/api';

export const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  WAITING_ON_CUSTOMER: 'Waiting on customer',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

/** What a button that moves a ticket into this status should say. */
export const STATUS_ACTION_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Reopen',
  IN_PROGRESS: 'Start work',
  WAITING_ON_CUSTOMER: 'Wait for customer',
  RESOLVED: 'Mark resolved',
  CLOSED: 'Close ticket',
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  HARDWARE: 'Hardware',
  SOFTWARE: 'Software',
  NETWORK: 'Network',
  ACCESS: 'Access & accounts',
  EMAIL: 'Email',
  SECURITY: 'Security',
  OTHER: 'Other',
};

export const ROLE_LABEL: Record<Role, string> = {
  CUSTOMER: 'Customer',
  AGENT: 'Agent',
  ADMIN: 'Admin',
};

export const ACTION_LABEL: Record<AuditAction, string> = {
  TICKET_CREATED: 'Ticket created',
  STATUS_CHANGED: 'Status changed',
  ASSIGNED: 'Assigned',
  REASSIGNED: 'Reassigned',
  UNASSIGNED: 'Unassigned',
  PRIORITY_CHANGED: 'Priority changed',
  NOTE_ADDED: 'Internal note added',
};

export const ticketRef = (number: number): string => `ITSM-${number}`;

/** Statuses in which a ticket still needs work. */
export const ACTIVE_STATUSES: readonly TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER'];

export const isStaff = (role: Role): boolean => role === 'AGENT' || role === 'ADMIN';

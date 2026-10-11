/**
 * Shapes returned by the API. Dates travel as ISO-8601 strings.
 * Keep in sync with server/src/modules/** (the `*.selects.ts` and `*.types.ts` files).
 */

export const ROLES = ['CUSTOMER', 'AGENT', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_ON_CUSTOMER',
  'RESOLVED',
  'CLOSED',
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = [
  'HARDWARE',
  'SOFTWARE',
  'NETWORK',
  'ACCESS',
  'EMAIL',
  'SECURITY',
  'OTHER',
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export const AUDIT_ACTIONS = [
  'TICKET_CREATED',
  'STATUS_CHANGED',
  'ASSIGNED',
  'REASSIGNED',
  'UNASSIGNED',
  'PRIORITY_CHANGED',
  'NOTE_ADDED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type NotificationType = 'TICKET_ASSIGNED' | 'STATUS_CHANGED' | 'NEW_MESSAGE';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface UserRef {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface StaffMember extends UserRef {
  skills: TicketCategory[];
  isActive: boolean;
}

export interface UserAdminView extends StaffMember {
  createdAt: string;
}

export interface TicketSummary {
  id: string;
  number: number;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  requesterId: string;
  assigneeId: string | null;
  slaDueAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  requester: UserRef;
  assignee: UserRef | null;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: UserRef;
}

export interface TicketDetail extends TicketSummary {
  description: string;
  messages: TicketMessage[];
  /** Status changes the current user may make right now. */
  allowedTransitions: TicketStatus[];
}

export type AuditMetadata = Record<string, string | number | boolean | null>;

export interface AuditEntry {
  id: string;
  ticketId: string;
  action: AuditAction;
  fromValue: string | null;
  toValue: string | null;
  metadata: AuditMetadata | null;
  createdAt: string;
  actor: UserRef | null;
  ticket: { number: number; title: string };
}

export interface NotificationItem {
  id: string;
  userId: string;
  ticketId: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationInbox {
  items: NotificationItem[];
  unreadCount: number;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AnalyticsOverview {
  range: { from: string; to: string; days: number };
  totals: { active: number; unassigned: number; overdue: number; created: number; resolved: number };
  averages: {
    resolutionHours: number | null;
    firstResponseMinutes: number | null;
    slaCompliance: number | null;
  };
  byStatus: Array<{ status: TicketStatus; count: number }>;
  byPriority: Array<{ priority: TicketPriority; count: number }>;
  byCategory: Array<{ category: TicketCategory; count: number }>;
  volume: Array<{ date: string; created: number; resolved: number }>;
  agents: Array<{
    id: string;
    name: string;
    open: number;
    resolved: number;
    avgResolutionHours: number | null;
  }>;
}

export type TicketChange = 'status' | 'assignment' | 'priority';

export interface TypingPayload {
  ticketId: string;
  userId: string;
  name: string;
  isTyping: boolean;
}

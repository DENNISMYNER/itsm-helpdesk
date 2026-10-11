import type { TicketFilters } from '../api/tickets.api';

/** One place for cache keys so live updates can invalidate exactly the right queries. */
export const queryKeys = {
  me: ['me'] as const,
  tickets: ['tickets'] as const,
  ticketList: (filters: TicketFilters) => ['tickets', 'list', filters] as const,
  ticket: (id: string) => ['tickets', 'detail', id] as const,
  activity: (id: string) => ['tickets', 'activity', id] as const,
  analytics: (days: number) => ['analytics', days] as const,
  analyticsAll: ['analytics'] as const,
  staff: ['staff'] as const,
  users: ['users'] as const,
  audit: ['audit'] as const,
  notifications: ['notifications'] as const,
};

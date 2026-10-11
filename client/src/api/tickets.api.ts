import { api } from '../lib/api-client';
import type {
  AuditEntry,
  Page,
  TicketCategory,
  TicketDetail,
  TicketMessage,
  TicketPriority,
  TicketStatus,
  TicketSummary,
} from '../types/api';

export type TicketSort = 'newest' | 'oldest' | 'updated' | 'priority';

export interface TicketFilters {
  status: TicketStatus[];
  priority: TicketPriority[];
  category: TicketCategory[];
  /** `me`, `unassigned` or empty for everyone. */
  assignee: string;
  q: string;
  sort: TicketSort;
  page: number;
}

export interface NewTicketInput {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
}

export const ticketsApi = {
  list: (filters: TicketFilters, pageSize = 15) =>
    api.get<Page<TicketSummary>>('/tickets', { ...filters, pageSize }),
  get: (id: string) => api.get<{ ticket: TicketDetail }>(`/tickets/${id}`).then((r) => r.ticket),
  create: (input: NewTicketInput) =>
    api.post<{ ticket: TicketSummary }>('/tickets', input).then((r) => r.ticket),
  changeStatus: (id: string, status: TicketStatus) =>
    api.patch<{ ticket: TicketDetail }>(`/tickets/${id}/status`, { status }).then((r) => r.ticket),
  assign: (id: string, assigneeId: string | null) =>
    api.patch<{ ticket: TicketDetail }>(`/tickets/${id}/assignee`, { assigneeId }).then((r) => r.ticket),
  changePriority: (id: string, priority: TicketPriority) =>
    api.patch<{ ticket: TicketDetail }>(`/tickets/${id}/priority`, { priority }).then((r) => r.ticket),
  postMessage: (id: string, body: string, isInternal: boolean) =>
    api
      .post<{ message: TicketMessage }>(`/tickets/${id}/messages`, { body, isInternal })
      .then((r) => r.message),
  activity: (id: string) => api.get<{ items: AuditEntry[] }>(`/tickets/${id}/activity`).then((r) => r.items),
};

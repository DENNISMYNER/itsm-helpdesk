import { api } from '../lib/api-client';
import type {
  AnalyticsOverview,
  AuditAction,
  AuditEntry,
  NotificationInbox,
  Page,
  Role,
  StaffMember,
  TicketCategory,
  UserAdminView,
} from '../types/api';

export interface UpdateUserInput {
  role?: Role;
  isActive?: boolean;
  skills?: TicketCategory[];
}

export const analyticsApi = {
  overview: (days: number) => api.get<AnalyticsOverview>('/analytics/overview', { days }),
};

export const usersApi = {
  staff: () => api.get<{ items: StaffMember[] }>('/users/staff').then((r) => r.items),
  list: (query: { page: number; q: string; role: Role | '' }) =>
    api.get<Page<UserAdminView>>('/users', { ...query, pageSize: 20 }),
  update: (id: string, input: UpdateUserInput) =>
    api.patch<{ user: UserAdminView }>(`/users/${id}`, input).then((r) => r.user),
};

export const auditApi = {
  list: (query: { page: number; action: AuditAction[]; ticketNumber: string }) =>
    api.get<Page<AuditEntry>>('/audit', { ...query, pageSize: 25 }),
};

export const notificationsApi = {
  inbox: () => api.get<NotificationInbox>('/notifications'),
  markRead: (id: string) => api.post<void>(`/notifications/${id}/read`),
  markAllRead: () => api.post<void>('/notifications/read-all'),
};

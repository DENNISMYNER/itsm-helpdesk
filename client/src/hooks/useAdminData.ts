import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { analyticsApi, auditApi, usersApi, type UpdateUserInput } from '../api/admin.api';
import { queryKeys } from '../lib/query-keys';
import type { AuditAction, Role } from '../types/api';

export function useAnalytics(days: number) {
  return useQuery({
    queryKey: queryKeys.analytics(days),
    queryFn: () => analyticsApi.overview(days),
    placeholderData: keepPreviousData,
  });
}

export function useUsers(params: { page: number; q: string; role: Role | '' }) {
  return useQuery({
    queryKey: [...queryKeys.users, params],
    queryFn: () => usersApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => usersApi.update(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users });
      void queryClient.invalidateQueries({ queryKey: queryKeys.staff });
    },
  });
}

export function useAuditLog(params: { page: number; action: AuditAction[]; ticketNumber: string }) {
  return useQuery({
    queryKey: [...queryKeys.audit, params],
    queryFn: () => auditApi.list(params),
    placeholderData: keepPreviousData,
  });
}

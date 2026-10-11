import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ticketsApi, type NewTicketInput, type TicketFilters } from '../api/tickets.api';
import { queryKeys } from '../lib/query-keys';
import type { TicketDetail, TicketPriority, TicketStatus } from '../types/api';

export function useTicketList(filters: TicketFilters) {
  return useQuery({
    queryKey: queryKeys.ticketList(filters),
    queryFn: () => ticketsApi.list(filters),
    placeholderData: keepPreviousData, // keep the old page on screen while the next one loads
  });
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: queryKeys.ticket(id),
    queryFn: () => ticketsApi.get(id),
  });
}

export function useTicketActivity(id: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.activity(id),
    queryFn: () => ticketsApi.activity(id),
    enabled,
  });
}

/** Every mutation that returns the fresh ticket writes it straight into the cache. */
export function useTicketMutations(ticketId: string) {
  const queryClient = useQueryClient();

  const onTicket = (ticket: TicketDetail) => {
    queryClient.setQueryData(queryKeys.ticket(ticketId), ticket);
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.tickets, 'list'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.analyticsAll });
    void queryClient.invalidateQueries({ queryKey: queryKeys.activity(ticketId) });
  };

  return {
    changeStatus: useMutation({
      mutationFn: (status: TicketStatus) => ticketsApi.changeStatus(ticketId, status),
      onSuccess: onTicket,
    }),
    assign: useMutation({
      mutationFn: (assigneeId: string | null) => ticketsApi.assign(ticketId, assigneeId),
      onSuccess: onTicket,
    }),
    changePriority: useMutation({
      mutationFn: (priority: TicketPriority) => ticketsApi.changePriority(ticketId, priority),
      onSuccess: onTicket,
    }),
    postMessage: useMutation({
      mutationFn: (input: { body: string; isInternal: boolean }) =>
        ticketsApi.postMessage(ticketId, input.body, input.isInternal),
      // The socket delivers the message to everyone (including the sender); refetching covers
      // the case where the socket is down, and also picks up the automatic status change.
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.ticket(ticketId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.activity(ticketId) });
      },
    }),
  };
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewTicketInput) => ticketsApi.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.tickets, 'list'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analyticsAll });
    },
  });
}

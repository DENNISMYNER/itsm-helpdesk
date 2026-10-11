import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../context/ToastContext';
import { queryKeys } from '../lib/query-keys';
import type { AuditEntry, NotificationInbox, TicketDetail } from '../types/api';

const FLASH_MS = 1800;

/**
 * Connects Socket.io events to the TanStack Query cache, so every open screen updates live
 * without polling. Mounted once, inside the authenticated layout.
 *
 * Strategy: events that carry a complete record patch the cache directly (new chat messages,
 * notifications, activity). Events that change derived data (lists, counters, analytics,
 * allowed transitions) simply invalidate the affected queries and let them refetch.
 *
 * Returns the ids of tickets that just changed, which the ticket table briefly highlights.
 */
export function useLiveSync(): ReadonlySet<string> {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { notify } = useToast();
  const [flashing, setFlashing] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!socket) return undefined;
    const timers = new Set<number>();

    const flash = (ticketId: string) => {
      setFlashing((current) => new Set(current).add(ticketId));
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        setFlashing((current) => {
          const next = new Set(current);
          next.delete(ticketId);
          return next;
        });
      }, FLASH_MS);
      timers.add(timer);
    };

    const refreshLists = () => {
      void queryClient.invalidateQueries({ queryKey: [...queryKeys.tickets, 'list'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.analyticsAll });
    };

    socket.on('ticket:created', (ticket) => {
      refreshLists();
      flash(ticket.id);
    });

    socket.on('ticket:updated', ({ ticket }) => {
      refreshLists();
      void queryClient.invalidateQueries({ queryKey: queryKeys.ticket(ticket.id) });
      flash(ticket.id);
    });

    socket.on('message:new', ({ ticketId, message }) => {
      queryClient.setQueryData<TicketDetail>(queryKeys.ticket(ticketId), (current) => {
        if (!current || current.messages.some((existing) => existing.id === message.id)) return current;
        return { ...current, messages: [...current.messages, message] };
      });
    });

    socket.on('activity:new', (entry: AuditEntry) => {
      queryClient.setQueryData<AuditEntry[]>(queryKeys.activity(entry.ticketId), (current) => {
        if (!current || current.some((existing) => existing.id === entry.id)) return current;
        return [...current, entry];
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.audit });
    });

    socket.on('notification:new', (notification) => {
      queryClient.setQueryData<NotificationInbox>(queryKeys.notifications, (current) => {
        if (!current) return current;
        if (current.items.some((existing) => existing.id === notification.id)) return current;
        return {
          items: [notification, ...current.items].slice(0, 30),
          unreadCount: current.unreadCount + 1,
        };
      });
      notify({ title: notification.title, ...(notification.body ? { body: notification.body } : {}) });
    });

    return () => {
      socket.off('ticket:created');
      socket.off('ticket:updated');
      socket.off('message:new');
      socket.off('activity:new');
      socket.off('notification:new');
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [socket, queryClient, notify]);

  // After a dropped connection, anything could have changed: refetch everything once.
  const { connected } = useSocket();
  useEffect(() => {
    if (connected) void queryClient.invalidateQueries();
  }, [connected, queryClient]);

  return flashing;
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { notificationsApi } from '../../api/admin.api';
import { cn } from '../../lib/cn';
import { timeAgo } from '../../lib/format';
import { queryKeys } from '../../lib/query-keys';
import type { NotificationInbox, NotificationItem } from '../../types/api';

/** Bell with an unread badge. The inbox is kept live by `useLiveSync` (Socket.io). */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const root = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const inbox = useQuery({ queryKey: queryKeys.notifications, queryFn: notificationsApi.inbox });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: (id) => {
      queryClient.setQueryData<NotificationInbox>(queryKeys.notifications, (current) => {
        if (!current) return current;
        const target = current.items.find((item) => item.id === id);
        if (!target || target.readAt) return current;
        return {
          items: current.items.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)),
          unreadCount: Math.max(0, current.unreadCount - 1),
        };
      });
    },
    onError: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = inbox.data?.unreadCount ?? 0;

  const openItem = (item: NotificationItem) => {
    if (!item.readAt) markRead.mutate(item.id);
    setOpen(false);
    if (item.ticketId) void navigate(`/tickets/${item.ticketId}`);
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative rounded-md p-2 text-muted hover:bg-subtle hover:text-ink"
      >
        <Bell aria-hidden className="size-5" />
        {unread > 0 ? (
          <span className="tabular absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-brand-ink">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-panel shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={unread === 0 || markAll.isPending}
              className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-brand hover:bg-brand-soft disabled:text-faint disabled:hover:bg-transparent"
            >
              <CheckCheck aria-hidden className="size-3.5" />
              Mark all read
            </button>
          </div>
          <ul className="max-h-96 divide-y divide-line overflow-y-auto">
            {inbox.data?.items.length ? (
              inbox.data.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={cn('flex w-full gap-3 px-4 py-3 text-left hover:bg-subtle', !item.readAt && 'bg-brand-soft/50')}
                  >
                    <span
                      aria-hidden
                      className={cn('mt-1.5 size-2 shrink-0 rounded-full', item.readAt ? 'bg-transparent' : 'bg-brand')}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{item.title}</span>
                      {item.body ? <span className="block truncate text-sm text-muted">{item.body}</span> : null}
                      <span className="mt-0.5 block text-xs text-faint">{timeAgo(item.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-8 text-center text-sm text-muted">
                {inbox.isError ? 'Notifications could not be loaded.' : "You're all caught up."}
              </li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

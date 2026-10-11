import type { NotificationType } from '../../domain/enums';
import type { DomainEvent } from '../../events/domain-events';
import { NotFoundError } from '../../lib/errors';
import { prisma, type DbClient } from '../../lib/prisma';
import { notificationSelect, type NotificationDto } from './notification.selects';

export interface NotificationDraft {
  userId: string;
  ticketId: string;
  type: NotificationType;
  title: string;
  body?: string;
}

/**
 * Persists a notification inside the caller's transaction and queues the
 * realtime event to be published once that transaction commits.
 */
export async function queueNotification(
  tx: DbClient,
  events: DomainEvent[],
  draft: NotificationDraft,
): Promise<void> {
  const notification = await tx.notification.create({
    data: {
      userId: draft.userId,
      ticketId: draft.ticketId,
      type: draft.type,
      title: draft.title,
      body: draft.body ?? null,
    },
    select: notificationSelect,
  });
  events.push({ type: 'notification.created', userId: draft.userId, notification });
}

export interface NotificationInbox {
  items: NotificationDto[];
  unreadCount: number;
}

const INBOX_SIZE = 30;

export async function getInbox(userId: string): Promise<NotificationInbox> {
  const [items, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: INBOX_SIZE,
      select: notificationSelect,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return { items, unreadCount };
}

export async function markRead(userId: string, notificationId: string): Promise<void> {
  const owned = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true },
  });
  if (!owned) throw new NotFoundError('Notification not found');

  await prisma.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

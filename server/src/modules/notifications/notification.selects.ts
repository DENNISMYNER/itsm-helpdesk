import type { Prisma } from '../../lib/prisma';

export const notificationSelect = {
  id: true,
  userId: true,
  ticketId: true,
  type: true,
  title: true,
  body: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;
export type NotificationDto = Prisma.NotificationGetPayload<{ select: typeof notificationSelect }>;

/**
 * Socket.io room names. Rooms are the authorisation boundary of the realtime layer:
 * a socket only receives what is emitted to rooms it was allowed to join.
 *
 *   staff                 every agent/admin (live queue + dashboard)
 *   user:<id>             one person's private channel (notifications, "my tickets")
 *   ticket:<id>           participants of one ticket (public chat)
 *   ticket:<id>:staff     staff on one ticket (internal notes, audit activity)
 */
export const rooms = {
  staff: 'staff',
  user: (userId: string): string => `user:${userId}`,
  ticket: (ticketId: string): string => `ticket:${ticketId}`,
  ticketStaff: (ticketId: string): string => `ticket:${ticketId}:staff`,
} as const;

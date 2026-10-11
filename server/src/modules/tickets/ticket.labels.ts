import type { TicketStatus } from '../../domain/enums';

export const STATUS_LABEL: Readonly<Record<TicketStatus, string>> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  WAITING_ON_CUSTOMER: 'Waiting on customer',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

/** Human-friendly ticket reference, e.g. ITSM-1042. */
export const ticketRef = (number: number): string => `ITSM-${number}`;

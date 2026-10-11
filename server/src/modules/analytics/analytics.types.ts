import type { TicketCategory, TicketPriority, TicketStatus } from '../../domain/enums';

export interface AnalyticsOverview {
  range: { from: string; to: string; days: number };
  totals: {
    /** Tickets that still need work (OPEN, IN_PROGRESS, WAITING_ON_CUSTOMER). */
    active: number;
    /** Active tickets nobody owns. */
    unassigned: number;
    /** Active tickets past their SLA deadline. */
    overdue: number;
    /** Tickets created inside the range. */
    created: number;
    /** Tickets resolved inside the range. */
    resolved: number;
  };
  averages: {
    /** Mean hours from creation to resolution, for tickets resolved in the range. */
    resolutionHours: number | null;
    /** Mean minutes from creation to the first public staff reply. */
    firstResponseMinutes: number | null;
    /** Share (0-1) of tickets resolved in the range that met their SLA deadline. */
    slaCompliance: number | null;
  };
  byStatus: Array<{ status: TicketStatus; count: number }>;
  byPriority: Array<{ priority: TicketPriority; count: number }>;
  byCategory: Array<{ category: TicketCategory; count: number }>;
  /** One row per calendar day (UTC), zero-filled. */
  volume: Array<{ date: string; created: number; resolved: number }>;
  agents: Array<{
    id: string;
    name: string;
    open: number;
    resolved: number;
    avgResolutionHours: number | null;
  }>;
}

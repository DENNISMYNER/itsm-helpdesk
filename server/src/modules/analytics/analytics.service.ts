import {
  ACTIVE_STATUSES,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '../../domain/enums';
import { prisma } from '../../lib/prisma';
import { queryAgentPerformance, queryAverages, queryVolume } from './analytics.queries';
import type { AnalyticsOverview } from './analytics.types';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Rounds to one decimal so the API does not leak floating-point noise. */
const round1 = (value: number | null): number | null =>
  value === null ? null : Math.round(value * 10) / 10;

/** Counts per enum value, including zeros, in the enum's declaration order. */
function fillCounts<K extends string>(
  keys: readonly K[],
  rows: Array<{ key: K; count: number }>,
): Array<{ key: K; count: number }> {
  const counts = new Map(rows.map((row) => [row.key, row.count]));
  return keys.map((key) => ({ key, count: counts.get(key) ?? 0 }));
}

export async function getOverview(days: number): Promise<AnalyticsOverview> {
  const to = new Date();
  const from = new Date(to.getTime() - days * DAY_MS);
  const active = { status: { in: [...ACTIVE_STATUSES] } };

  const [
    activeCount,
    unassigned,
    overdue,
    created,
    resolved,
    statusRows,
    priorityRows,
    categoryRows,
    averages,
    volume,
    agents,
  ] = await Promise.all([
    prisma.ticket.count({ where: active }),
    prisma.ticket.count({ where: { ...active, assigneeId: null } }),
    prisma.ticket.count({ where: { ...active, slaDueAt: { lt: to } } }),
    prisma.ticket.count({ where: { createdAt: { gte: from, lte: to } } }),
    prisma.ticket.count({ where: { resolvedAt: { gte: from, lte: to } } }),
    prisma.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.ticket.groupBy({ by: ['priority'], where: active, _count: { _all: true } }),
    prisma.ticket.groupBy({
      by: ['category'],
      where: { createdAt: { gte: from, lte: to } },
      _count: { _all: true },
    }),
    queryAverages(from, to),
    queryVolume(from, to),
    queryAgentPerformance(from, to),
  ]);

  return {
    range: { from: from.toISOString(), to: to.toISOString(), days },
    totals: { active: activeCount, unassigned, overdue, created, resolved },
    averages: {
      resolutionHours: round1(averages.resolutionHours),
      firstResponseMinutes: round1(averages.firstResponseMinutes),
      slaCompliance:
        averages.slaCompliance === null ? null : Math.round(averages.slaCompliance * 1000) / 1000,
    },
    byStatus: fillCounts(
      Object.values(TicketStatus),
      statusRows.map((row) => ({ key: row.status, count: row._count._all })),
    ).map(({ key, count }) => ({ status: key, count })),
    byPriority: fillCounts(
      Object.values(TicketPriority),
      priorityRows.map((row) => ({ key: row.priority, count: row._count._all })),
    ).map(({ key, count }) => ({ priority: key, count })),
    byCategory: fillCounts(
      Object.values(TicketCategory),
      categoryRows.map((row) => ({ key: row.category, count: row._count._all })),
    ).map(({ key, count }) => ({ category: key, count })),
    volume,
    agents: agents.map((agent) => ({
      ...agent,
      avgResolutionHours: round1(agent.avgResolutionHours),
    })),
  };
}

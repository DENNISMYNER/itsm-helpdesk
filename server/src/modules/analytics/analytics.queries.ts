import { Prisma, prisma } from '../../lib/prisma';

/**
 * Reporting SQL. Aggregations run in PostgreSQL (not in Node) and lean on the compound
 * indexes declared in schema.prisma:
 *   tickets_createdAt_idx / tickets_resolvedAt_idx   -> range scans
 *   tickets_assigneeId_status_updatedAt_idx          -> per-agent workload
 * Every cast to ::int / ::float8 matters: without it the driver returns bigint / numeric
 * values that do not survive JSON serialisation.
 */

export interface AveragesRow {
  resolutionHours: number | null;
  firstResponseMinutes: number | null;
  slaCompliance: number | null;
}

export async function queryAverages(from: Date, to: Date): Promise<AveragesRow> {
  const rows = await prisma.$queryRaw<AveragesRow[]>(Prisma.sql`
    SELECT
      (AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600.0))::float8 AS "resolutionHours",
      (AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt")) / 60.0)
        FILTER (WHERE "firstResponseAt" IS NOT NULL))::float8 AS "firstResponseMinutes",
      (COUNT(*) FILTER (WHERE "resolvedAt" <= "slaDueAt")::float8 / NULLIF(COUNT(*), 0))::float8
        AS "slaCompliance"
    FROM "tickets"
    WHERE "resolvedAt" >= ${from}::timestamptz AND "resolvedAt" <= ${to}::timestamptz
  `);
  return rows[0] ?? { resolutionHours: null, firstResponseMinutes: null, slaCompliance: null };
}

export interface VolumeRow {
  date: string;
  created: number;
  resolved: number;
}

/** Created vs resolved per UTC day, with zero-filled gaps so charts have no holes. */
export function queryVolume(from: Date, to: Date): Promise<VolumeRow[]> {
  return prisma.$queryRaw<VolumeRow[]>(Prisma.sql`
    WITH days AS (
      SELECT generate_series(
        date_trunc('day', ${from}::timestamptz AT TIME ZONE 'UTC'),
        date_trunc('day', ${to}::timestamptz AT TIME ZONE 'UTC'),
        interval '1 day'
      ) AS day
    ),
    created AS (
      SELECT date_trunc('day', "createdAt" AT TIME ZONE 'UTC') AS day, COUNT(*)::int AS n
      FROM "tickets"
      WHERE "createdAt" >= ${from}::timestamptz AND "createdAt" <= ${to}::timestamptz
      GROUP BY 1
    ),
    resolved AS (
      SELECT date_trunc('day', "resolvedAt" AT TIME ZONE 'UTC') AS day, COUNT(*)::int AS n
      FROM "tickets"
      WHERE "resolvedAt" >= ${from}::timestamptz AND "resolvedAt" <= ${to}::timestamptz
      GROUP BY 1
    )
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS "date",
      COALESCE(c.n, 0)::int AS "created",
      COALESCE(r.n, 0)::int AS "resolved"
    FROM days d
    LEFT JOIN created c ON c.day = d.day
    LEFT JOIN resolved r ON r.day = d.day
    ORDER BY d.day
  `);
}

export interface AgentRow {
  id: string;
  name: string;
  open: number;
  resolved: number;
  avgResolutionHours: number | null;
}

export function queryAgentPerformance(from: Date, to: Date): Promise<AgentRow[]> {
  return prisma.$queryRaw<AgentRow[]>(Prisma.sql`
    SELECT
      u."id",
      u."name",
      COUNT(t."id") FILTER (
        WHERE t."status" IN ('OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER')
      )::int AS "open",
      COUNT(t."id") FILTER (
        WHERE t."resolvedAt" >= ${from}::timestamptz AND t."resolvedAt" <= ${to}::timestamptz
      )::int AS "resolved",
      (AVG(EXTRACT(EPOCH FROM (t."resolvedAt" - t."createdAt")) / 3600.0) FILTER (
        WHERE t."resolvedAt" >= ${from}::timestamptz AND t."resolvedAt" <= ${to}::timestamptz
      ))::float8 AS "avgResolutionHours"
    FROM "users" u
    LEFT JOIN "tickets" t ON t."assigneeId" = u."id"
    WHERE u."role" = 'AGENT' AND u."isActive" = true
    GROUP BY u."id", u."name"
    ORDER BY "resolved" DESC, u."name" ASC
  `);
}

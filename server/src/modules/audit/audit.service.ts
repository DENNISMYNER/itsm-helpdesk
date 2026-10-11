import type { AuditAction } from '../../domain/enums';
import { buildPage, type Page } from '../../lib/http';
import { prisma, type DbClient, type Prisma } from '../../lib/prisma';
import { auditEntrySelect, type AuditEntry } from './audit.selects';
import type { ListAuditQuery } from './audit.schemas';

export type AuditMetadata = Record<string, string | number | boolean | null>;

export interface AuditInput {
  ticketId: string;
  /** Null when the system itself acted (e.g. automated routing). */
  actorId: string | null;
  action: AuditAction;
  fromValue?: string | null;
  toValue?: string | null;
  metadata?: AuditMetadata;
}

/**
 * Appends one immutable entry. Always call inside the same transaction as the
 * change it describes, so the log can never disagree with the data.
 */
export function recordAudit(tx: DbClient, input: AuditInput): Promise<AuditEntry> {
  return tx.auditLog.create({
    data: {
      ticketId: input.ticketId,
      actorId: input.actorId,
      action: input.action,
      fromValue: input.fromValue ?? null,
      toValue: input.toValue ?? null,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
    select: auditEntrySelect,
  });
}

/** Full history of one ticket, oldest first. */
export function listTicketActivity(ticketId: string): Promise<AuditEntry[]> {
  return prisma.auditLog.findMany({
    where: { ticketId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: auditEntrySelect,
  });
}

/** Global activity stream (admins), newest first. */
export async function listAuditLog(query: ListAuditQuery): Promise<Page<AuditEntry>> {
  const where: Prisma.AuditLogWhereInput = {
    ...(query.action && query.action.length > 0 ? { action: { in: query.action } } : {}),
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(query.ticketNumber ? { ticket: { number: query.ticketNumber } } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: auditEntrySelect,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return buildPage(items, total, query.page, query.pageSize);
}

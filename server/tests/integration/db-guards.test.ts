import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TicketStatus } from '../../src/domain/enums';
import { TRANSITIONS } from '../../src/modules/tickets/ticket.state-machine';

/**
 * These tests bypass the application entirely and speak SQL, proving the guarantees
 * hold at the database level (the "last line of defence" the README describes).
 */
const connectionString = process.env.DATABASE_URL_TEST;

describe.skipIf(!connectionString)('database guards (PostgreSQL triggers & constraints)', () => {
  let db: Client;
  let userId: string;

  async function createTicket(status: string = 'OPEN'): Promise<string> {
    const id = randomUUID();
    await db.query(
      `INSERT INTO "tickets" ("id","title","description","status","requesterId","slaDueAt","updatedAt")
       VALUES ($1,'Test ticket','Created by the integration suite',$2::"TicketStatus",$3, now() + interval '1 day', now())`,
      [id, status, userId],
    );
    return id;
  }

  const setStatus = (id: string, status: string, extra = ''): Promise<unknown> =>
    db.query(`UPDATE "tickets" SET "status" = $2::"TicketStatus" ${extra} WHERE "id" = $1`, [id, status]);

  beforeAll(async () => {
    db = new Client({ connectionString });
    await db.connect();
    userId = randomUUID();
    await db.query(
      `INSERT INTO "users" ("id","email","name","passwordHash","updatedAt")
       VALUES ($1,$2,'Guard Tester','not-a-real-hash', now())`,
      [userId, `guard-${userId}@example.com`],
    );
  });

  afterAll(async () => {
    await db.end();
  });

  describe('status state machine', () => {
    it('only accepts OPEN as the initial status', async () => {
      await expect(createTicket('RESOLVED')).rejects.toThrow(/INVALID_INITIAL_STATUS/);
      await expect(createTicket('CLOSED')).rejects.toThrow(/INVALID_INITIAL_STATUS/);
      await expect(createTicket('OPEN')).resolves.toBeTypeOf('string');
    });

    it('allows the full happy path OPEN -> ... -> CLOSED', async () => {
      const id = await createTicket();
      await setStatus(id, 'IN_PROGRESS');
      await setStatus(id, 'WAITING_ON_CUSTOMER');
      await setStatus(id, 'IN_PROGRESS');
      await setStatus(id, 'RESOLVED', `, "resolvedAt" = now()`);
      await setStatus(id, 'CLOSED', `, "closedAt" = now()`);

      const { rows } = await db.query(`SELECT "status" FROM "tickets" WHERE "id" = $1`, [id]);
      expect(rows[0]?.status).toBe('CLOSED');
    });

    it('rejects skipped stages', async () => {
      const id = await createTicket();
      await expect(setStatus(id, 'RESOLVED', `, "resolvedAt" = now()`)).rejects.toThrow(
        /INVALID_STATUS_TRANSITION: OPEN -> RESOLVED/,
      );
      await expect(setStatus(id, 'CLOSED', `, "resolvedAt" = now(), "closedAt" = now()`)).rejects.toThrow(
        /INVALID_STATUS_TRANSITION: OPEN -> CLOSED/,
      );
    });

    it('makes CLOSED terminal', async () => {
      const id = await createTicket();
      await setStatus(id, 'IN_PROGRESS');
      await setStatus(id, 'RESOLVED', `, "resolvedAt" = now()`);
      await setStatus(id, 'CLOSED', `, "closedAt" = now()`);
      await expect(setStatus(id, 'IN_PROGRESS')).rejects.toThrow(/INVALID_STATUS_TRANSITION: CLOSED -> IN_PROGRESS/);
      await expect(setStatus(id, 'OPEN')).rejects.toThrow(/INVALID_STATUS_TRANSITION/);
    });

    it('allows non-status updates on any ticket', async () => {
      const id = await createTicket();
      await expect(
        db.query(`UPDATE "tickets" SET "priority" = 'HIGH', "updatedAt" = now() WHERE "id" = $1`, [id]),
      ).resolves.toBeDefined();
    });

    it('keeps lifecycle timestamps consistent with the status (CHECK constraints)', async () => {
      const id = await createTicket();
      await setStatus(id, 'IN_PROGRESS');
      await expect(setStatus(id, 'RESOLVED')).rejects.toThrow(/tickets_resolved_requires_resolvedAt/);
      await setStatus(id, 'RESOLVED', `, "resolvedAt" = now()`);
      await expect(setStatus(id, 'CLOSED')).rejects.toThrow(/tickets_closed_requires_closedAt/);
    });

    it('stays in sync with the application state machine', async () => {
      const { rows } = await db.query<{ fromStatus: string; toStatus: string }>(
        `SELECT "fromStatus"::text AS "fromStatus", "toStatus"::text AS "toStatus" FROM "ticket_status_transitions"`,
      );
      const inDatabase = rows.map((row) => `${row.fromStatus}->${row.toStatus}`).sort();
      const inCode = Object.values(TicketStatus)
        .flatMap((from) => TRANSITIONS[from].map((to) => `${from}->${to}`))
        .sort();
      expect(inDatabase).toEqual(inCode);
    });
  });

  describe('immutable audit log', () => {
    let ticketId: string;
    let auditId: string;

    beforeAll(async () => {
      ticketId = await createTicket();
      auditId = randomUUID();
      await db.query(
        `INSERT INTO "audit_logs" ("id","ticketId","actorId","action","toValue")
         VALUES ($1,$2,$3,'TICKET_CREATED','OPEN')`,
        [auditId, ticketId, userId],
      );
    });

    it('accepts inserts', async () => {
      const { rows } = await db.query(`SELECT count(*)::int AS n FROM "audit_logs" WHERE "id" = $1`, [auditId]);
      expect(rows[0]?.n).toBe(1);
    });

    it('rejects UPDATE', async () => {
      await expect(
        db.query(`UPDATE "audit_logs" SET "toValue" = 'tampered' WHERE "id" = $1`, [auditId]),
      ).rejects.toThrow(/AUDIT_LOG_IMMUTABLE/);
    });

    it('rejects DELETE', async () => {
      await expect(db.query(`DELETE FROM "audit_logs" WHERE "id" = $1`, [auditId])).rejects.toThrow(
        /AUDIT_LOG_IMMUTABLE/,
      );
    });

    it('rejects TRUNCATE', async () => {
      await expect(db.query(`TRUNCATE TABLE "audit_logs"`)).rejects.toThrow(/AUDIT_LOG_IMMUTABLE/);
    });

    it('prevents deleting a ticket that has audit history', async () => {
      await expect(db.query(`DELETE FROM "tickets" WHERE "id" = $1`, [ticketId])).rejects.toThrow();
    });
  });

  describe('schema', () => {
    it('numbers tickets from 1001', async () => {
      const id = await createTicket();
      const { rows } = await db.query<{ number: number }>(`SELECT "number" FROM "tickets" WHERE "id" = $1`, [id]);
      expect(rows[0]?.number).toBeGreaterThanOrEqual(1001);
    });

    it('has the compound indexes the reporting queries rely on', async () => {
      const { rows } = await db.query<{ indexname: string }>(
        `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('tickets','audit_logs','notifications')`,
      );
      const names = new Set(rows.map((row) => row.indexname));
      for (const expected of [
        'tickets_status_priority_createdAt_idx',
        'tickets_assigneeId_status_updatedAt_idx',
        'tickets_requesterId_createdAt_idx',
        'tickets_category_status_idx',
        'tickets_createdAt_idx',
        'tickets_resolvedAt_idx',
        'tickets_status_slaDueAt_idx',
        'audit_logs_ticketId_createdAt_idx',
        'notifications_userId_readAt_createdAt_idx',
      ]) {
        expect(names, `missing index ${expected}`).toContain(expected);
      }
    });
  });
});

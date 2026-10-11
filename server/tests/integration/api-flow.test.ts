import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * End-to-end API behaviour against a real database: authentication, role checks,
 * routing, the status state machine, chat privacy and the audit trail.
 */
const connectionString = process.env.DATABASE_URL_TEST;

interface ApiResult<T = any> {
  status: number;
  body: T;
}

describe.skipIf(!connectionString)('ticket API flow', () => {
  let server: Server;
  let baseUrl: string;
  let shutdown: () => Promise<void>;

  const cookies = new Map<string, string>();

  async function api<T = any>(
    who: string | null,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<ApiResult<T>> {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const cookie = who ? cookies.get(who) : undefined;
    if (cookie) headers.cookie = cookie;
    const response = await fetch(`${baseUrl}/api${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const text = await response.text();
    if (who === null || path.startsWith('/auth/')) {
      const set = response.headers.get('set-cookie');
      if (set && body && typeof body === 'object' && 'email' in body) {
        cookies.set(String((body as { email: string }).email), set.split(';')[0] ?? '');
      }
    }
    return { status: response.status, body: text ? (JSON.parse(text) as T) : (undefined as T) };
  }

  const CUSTOMER = 'flow.customer@example.com';
  const OTHER = 'flow.other@example.com';
  const AGENT = 'flow.agent@example.com';
  const ADMIN = 'flow.admin@example.com';
  const PASSWORD = 'Passw0rd-flow';

  beforeAll(async () => {
    // Imported lazily so the app only loads when a test database is configured.
    const { createApp } = await import('../../src/app.js');
    const { prisma } = await import('../../src/lib/prisma.js');
    const { Role } = await import('../../src/domain/enums.js');

    server = createApp().listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    shutdown = async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await prisma.$disconnect();
    };

    for (const email of [CUSTOMER, OTHER, AGENT, ADMIN]) {
      const result = await api(null, 'POST', '/auth/register', {
        name: email.split('@')[0],
        email,
        password: PASSWORD,
      });
      expect(result.status).toBe(201);
    }
    // Staff accounts are provisioned out-of-band; promote directly in the database.
    await prisma.user.update({ where: { email: AGENT }, data: { role: Role.AGENT } });
    await prisma.user.update({ where: { email: ADMIN }, data: { role: Role.ADMIN } });
    for (const email of [AGENT, ADMIN]) {
      expect((await api(null, 'POST', '/auth/login', { email, password: PASSWORD })).status).toBe(200);
    }
  });

  afterAll(async () => {
    await shutdown?.();
  });

  describe('authentication', () => {
    it('rejects anonymous requests', async () => {
      expect((await api(null, 'GET', '/tickets')).status).toBe(401);
    });

    it('rejects wrong passwords with a generic message', async () => {
      const result = await api(null, 'POST', '/auth/login', { email: CUSTOMER, password: 'wrong-Pass1' });
      expect(result.status).toBe(401);
      expect(result.body.error.message).toBe('Invalid email or password');
    });

    it('refuses duplicate registrations', async () => {
      const result = await api(null, 'POST', '/auth/register', {
        name: 'Dup',
        email: CUSTOMER,
        password: PASSWORD,
      });
      expect(result.status).toBe(409);
    });
  });

  describe('ticket lifecycle', () => {
    let ticketId: string;

    it('creates a ticket, escalates security text to CRITICAL and routes it to the agent', async () => {
      const result = await api(CUSTOMER, 'POST', '/tickets', {
        title: 'Suspicious login page',
        description: 'I think this is a phishing attack that asked for my password.',
        category: 'SECURITY',
        priority: 'LOW',
      });
      expect(result.status).toBe(201);
      expect(result.body.ticket).toMatchObject({ status: 'OPEN', priority: 'CRITICAL' });
      expect(result.body.ticket.assignee?.email).toBe(AGENT);
      ticketId = result.body.ticket.id;
    });

    it('validates input', async () => {
      const result = await api(CUSTOMER, 'POST', '/tickets', { title: 'x' });
      expect(result.status).toBe(400);
      expect(result.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('enforces the state machine (422) and role limits (403)', async () => {
      const skip = await api(AGENT, 'PATCH', `/tickets/${ticketId}/status`, { status: 'RESOLVED' });
      expect(skip.status).toBe(422);
      expect(skip.body.error.code).toBe('INVALID_STATUS_TRANSITION');
      expect(skip.body.error.details.allowed).toEqual(['IN_PROGRESS']);

      const forbidden = await api(CUSTOMER, 'PATCH', `/tickets/${ticketId}/status`, { status: 'IN_PROGRESS' });
      expect(forbidden.status).toBe(403);
    });

    it("hides tickets from other customers (404, not 403)", async () => {
      expect((await api(OTHER, 'GET', `/tickets/${ticketId}`)).status).toBe(404);
      const list = await api(OTHER, 'GET', '/tickets');
      expect(list.body.items.some((t: { id: string }) => t.id === ticketId)).toBe(false);
    });

    it('moves to IN_PROGRESS on the first staff reply and keeps internal notes private', async () => {
      const reply = await api(AGENT, 'POST', `/tickets/${ticketId}/messages`, { body: 'We are on it.' });
      expect(reply.status).toBe(201);
      await api(AGENT, 'POST', `/tickets/${ticketId}/messages`, { body: 'staff-only', isInternal: true });

      const forbiddenNote = await api(CUSTOMER, 'POST', `/tickets/${ticketId}/messages`, {
        body: 'sneaky',
        isInternal: true,
      });
      expect(forbiddenNote.status).toBe(403);

      const asCustomer = await api(CUSTOMER, 'GET', `/tickets/${ticketId}`);
      expect(asCustomer.body.ticket.status).toBe('IN_PROGRESS');
      expect(asCustomer.body.ticket.messages.map((m: { body: string }) => m.body)).toEqual(['We are on it.']);

      const asAgent = await api(AGENT, 'GET', `/tickets/${ticketId}`);
      expect(asAgent.body.ticket.messages).toHaveLength(2);
    });

    it('reopens work when the customer replies while waiting', async () => {
      await api(AGENT, 'PATCH', `/tickets/${ticketId}/status`, { status: 'WAITING_ON_CUSTOMER' });
      await api(CUSTOMER, 'POST', `/tickets/${ticketId}/messages`, { body: 'Here is the screenshot.' });
      const ticket = await api(AGENT, 'GET', `/tickets/${ticketId}`);
      expect(ticket.body.ticket.status).toBe('IN_PROGRESS');
    });

    it('lets the customer confirm a resolution and then blocks further chat', async () => {
      expect((await api(AGENT, 'PATCH', `/tickets/${ticketId}/status`, { status: 'RESOLVED' })).status).toBe(200);
      const closed = await api(CUSTOMER, 'PATCH', `/tickets/${ticketId}/status`, { status: 'CLOSED' });
      expect(closed.body.ticket.status).toBe('CLOSED');
      expect(closed.body.ticket.closedAt).not.toBeNull();

      const late = await api(CUSTOMER, 'POST', `/tickets/${ticketId}/messages`, { body: 'one more thing' });
      expect(late.status).toBe(409);
      expect(late.body.error.code).toBe('TICKET_CLOSED');
    });

    it('records every step in the immutable activity trail', async () => {
      const activity = await api(AGENT, 'GET', `/tickets/${ticketId}/activity`);
      const steps = activity.body.items.map(
        (e: { action: string; fromValue: string | null; toValue: string | null }) =>
          e.action === 'STATUS_CHANGED' ? `${e.fromValue}>${e.toValue}` : e.action,
      );
      expect(steps).toEqual([
        'TICKET_CREATED',
        'ASSIGNED',
        'OPEN>IN_PROGRESS',
        'NOTE_ADDED',
        'IN_PROGRESS>WAITING_ON_CUSTOMER',
        'WAITING_ON_CUSTOMER>IN_PROGRESS',
        'IN_PROGRESS>RESOLVED',
        'RESOLVED>CLOSED',
      ]);
      expect((await api(CUSTOMER, 'GET', `/tickets/${ticketId}/activity`)).status).toBe(403);
    });
  });

  describe('queue management', () => {
    it('lets staff reassign and re-prioritise, and rejects invalid assignees', async () => {
      const created = await api(CUSTOMER, 'POST', '/tickets', {
        title: 'Printer offline',
        description: 'The office printer shows offline for everyone today.',
        category: 'HARDWARE',
      });
      const id = created.body.ticket.id as string;

      const bad = await api(AGENT, 'PATCH', `/tickets/${id}/assignee`, { assigneeId: created.body.ticket.requesterId });
      expect(bad.status).toBe(400);

      const unassigned = await api(AGENT, 'PATCH', `/tickets/${id}/assignee`, { assigneeId: null });
      expect(unassigned.body.ticket.assignee).toBeNull();

      const raised = await api(AGENT, 'PATCH', `/tickets/${id}/priority`, { priority: 'HIGH' });
      expect(raised.body.ticket.priority).toBe('HIGH');

      expect((await api(CUSTOMER, 'PATCH', `/tickets/${id}/priority`, { priority: 'LOW' })).status).toBe(403);
    });
  });

  describe('analytics and administration', () => {
    it('serves analytics to staff only', async () => {
      const staff = await api(AGENT, 'GET', '/analytics/overview?days=7');
      expect(staff.status).toBe(200);
      expect(staff.body.volume.length).toBeGreaterThanOrEqual(7);
      expect(staff.body.byStatus.map((row: { status: string }) => row.status)).toEqual([
        'OPEN',
        'IN_PROGRESS',
        'WAITING_ON_CUSTOMER',
        'RESOLVED',
        'CLOSED',
      ]);
      expect((await api(CUSTOMER, 'GET', '/analytics/overview')).status).toBe(403);
    });

    it('restricts the global audit stream to admins', async () => {
      expect((await api(AGENT, 'GET', '/audit')).status).toBe(403);
      const admin = await api(ADMIN, 'GET', '/audit');
      expect(admin.status).toBe(200);
      expect(admin.body.total).toBeGreaterThan(0);
    });

    it('prevents admins from demoting themselves', async () => {
      const me = await api(ADMIN, 'GET', '/auth/me');
      const result = await api(ADMIN, 'PATCH', `/users/${me.body.user.id}`, { role: 'CUSTOMER' });
      expect(result.status).toBe(409);
    });
  });
});

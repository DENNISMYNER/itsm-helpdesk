import { describe, expect, it } from 'vitest';
import type { TicketCategory } from '../../src/domain/enums';
import { resolveInitialPriority } from '../../src/modules/routing/priority-escalation';
import {
  decideAssignment,
  pickLeastActive,
  pickRoundRobin,
  resolveRule,
} from '../../src/modules/routing/routing.engine';
import type { AgentCandidate } from '../../src/modules/routing/routing.types';
import { SLA_HOURS, computeSlaDueAt } from '../../src/modules/tickets/ticket.sla';

function agent(
  id: string,
  overrides: Partial<Omit<AgentCandidate, 'id'>> = {},
): AgentCandidate {
  return { id, name: `Agent ${id}`, skills: [], lastAssignedAt: null, load: 0, ...overrides };
}

const at = (iso: string): Date => new Date(iso);

describe('assignment strategies', () => {
  it('least-active picks the lowest weighted load', () => {
    const picked = pickLeastActive([agent('a', { load: 7 }), agent('b', { load: 2 }), agent('c', { load: 4 })]);
    expect(picked?.id).toBe('b');
  });

  it('least-active breaks ties by who was assigned longest ago, then id', () => {
    const picked = pickLeastActive([
      agent('a', { load: 2, lastAssignedAt: at('2026-10-10T10:00:00Z') }),
      agent('b', { load: 2, lastAssignedAt: at('2026-10-10T08:00:00Z') }),
      agent('c', { load: 2, lastAssignedAt: at('2026-10-10T09:00:00Z') }),
    ]);
    expect(picked?.id).toBe('b');
    expect(pickLeastActive([agent('z'), agent('m')])?.id).toBe('m');
  });

  it('round-robin prefers agents who were never assigned, then the oldest assignment', () => {
    expect(
      pickRoundRobin([
        agent('a', { lastAssignedAt: at('2026-10-10T08:00:00Z') }),
        agent('b'),
        agent('c', { lastAssignedAt: at('2026-10-10T07:00:00Z') }),
      ])?.id,
    ).toBe('b');
    expect(
      pickRoundRobin([
        agent('a', { lastAssignedAt: at('2026-10-10T08:00:00Z') }),
        agent('c', { lastAssignedAt: at('2026-10-10T07:00:00Z') }),
      ])?.id,
    ).toBe('c');
  });

  it('round-robin really rotates when lastAssignedAt is updated after every pick', () => {
    const pool = [agent('a'), agent('b'), agent('c')];
    const order: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const chosen = pickRoundRobin(pool);
      if (!chosen) throw new Error('expected an agent');
      order.push(chosen.id);
      chosen.lastAssignedAt = new Date(2026, 9, 10, 8, i);
    }
    expect(order).toEqual(['a', 'b', 'c', 'a', 'b', 'c']);
  });

  it('returns null for an empty pool', () => {
    expect(pickLeastActive([])).toBeNull();
    expect(pickRoundRobin([])).toBeNull();
  });
});

describe('rule resolution', () => {
  it('matches the first applicable rule', () => {
    expect(resolveRule({ category: 'NETWORK', priority: 'CRITICAL' }).id).toBe('critical-least-active');
    expect(resolveRule({ category: 'SECURITY', priority: 'LOW' }).id).toBe('security-least-active');
    expect(resolveRule({ category: 'HARDWARE', priority: 'MEDIUM' }).id).toBe('specialist-round-robin');
    expect(resolveRule({ category: 'OTHER', priority: 'MEDIUM' }).id).toBe('default');
  });
});

describe('decideAssignment', () => {
  const skilled = (category: TicketCategory): Partial<AgentCandidate> => ({ skills: [category] });

  it('routes to a specialist even when a generalist has less work', () => {
    const decision = decideAssignment(
      { category: 'NETWORK', priority: 'MEDIUM' },
      [agent('generalist', { load: 0 }), agent('netops', { ...skilled('NETWORK'), load: 9 })],
      'LEAST_ACTIVE',
    );
    expect(decision).toMatchObject({ agentId: 'netops', ruleId: 'specialist-round-robin', skillMatched: true });
  });

  it('uses least-active among specialists for critical tickets', () => {
    const decision = decideAssignment(
      { category: 'ACCESS', priority: 'CRITICAL' },
      [
        agent('a', { ...skilled('ACCESS'), load: 6 }),
        agent('b', { ...skilled('ACCESS'), load: 1 }),
        agent('c', { load: 0 }),
      ],
      'ROUND_ROBIN',
    );
    expect(decision).toMatchObject({ agentId: 'b', strategy: 'LEAST_ACTIVE' });
  });

  it('falls back to the whole pool when nobody has the skill', () => {
    const decision = decideAssignment(
      { category: 'EMAIL', priority: 'LOW' },
      [agent('a', { load: 3 }), agent('b', { load: 1 })],
      'LEAST_ACTIVE',
    );
    expect(decision).toMatchObject({ agentId: 'b', skillMatched: false });
  });

  it('applies the configured default strategy to uncategorised tickets', () => {
    const pool = [
      agent('busy-but-idle-longest', { load: 5, lastAssignedAt: at('2026-10-09T00:00:00Z') }),
      agent('light-but-recent', { load: 1, lastAssignedAt: at('2026-10-10T00:00:00Z') }),
    ];
    expect(decideAssignment({ category: 'OTHER', priority: 'LOW' }, pool, 'LEAST_ACTIVE')?.agentId).toBe(
      'light-but-recent',
    );
    expect(decideAssignment({ category: 'OTHER', priority: 'LOW' }, pool, 'ROUND_ROBIN')?.agentId).toBe(
      'busy-but-idle-longest',
    );
  });

  it('returns null when there are no agents', () => {
    expect(decideAssignment({ category: 'OTHER', priority: 'LOW' }, [], 'LEAST_ACTIVE')).toBeNull();
  });
});

describe('priority resolution', () => {
  it('caps customer-requested CRITICAL at HIGH', () => {
    const result = resolveInitialPriority('CUSTOMER', 'CRITICAL', 'Printer jam', 'Paper stuck in tray 2.');
    expect(result.priority).toBe('HIGH');
    expect(result.escalated).toBe(false);
  });

  it('lets staff create CRITICAL tickets', () => {
    expect(resolveInitialPriority('AGENT', 'CRITICAL', 'Disk failure', 'RAID array degraded.').priority).toBe(
      'CRITICAL',
    );
  });

  it('escalates security incidents to CRITICAL', () => {
    const result = resolveInitialPriority('CUSTOMER', 'LOW', 'Strange email', 'I think it was a phishing attack.');
    expect(result).toMatchObject({ priority: 'CRITICAL', escalated: true, reason: 'Possible security incident' });
  });

  it('escalates outages to at least HIGH but never lowers priority', () => {
    expect(resolveInitialPriority('CUSTOMER', 'LOW', 'No internet', 'The network is down in building B').priority).toBe('HIGH');
    expect(resolveInitialPriority('AGENT', 'CRITICAL', 'Server down', 'The server is down').priority).toBe('CRITICAL');
  });

  it('leaves ordinary tickets alone', () => {
    const result = resolveInitialPriority('CUSTOMER', 'MEDIUM', 'Keyboard sticky', 'Some keys stick.');
    expect(result).toMatchObject({ priority: 'MEDIUM', escalated: false, reason: null });
  });
});

describe('SLA', () => {
  it('computes the due date from the priority', () => {
    const created = at('2026-10-10T08:00:00.000Z');
    expect(computeSlaDueAt('CRITICAL', created).toISOString()).toBe('2026-10-10T12:00:00.000Z');
    expect(computeSlaDueAt('LOW', created).getTime() - created.getTime()).toBe(SLA_HOURS.LOW * 3_600_000);
  });
});

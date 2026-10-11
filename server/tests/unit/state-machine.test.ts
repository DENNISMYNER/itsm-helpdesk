import { describe, expect, it } from 'vitest';
import { Role, TicketStatus } from '../../src/domain/enums';
import { ForbiddenError, InvalidTransitionError } from '../../src/lib/errors';
import {
  TRANSITIONS,
  allowedTransitionsFor,
  assertTransition,
  canTransition,
  lifecycleTimestamps,
} from '../../src/modules/tickets/ticket.state-machine';

const ALL = Object.values(TicketStatus);

describe('ticket state machine', () => {
  it('follows OPEN -> IN_PROGRESS -> WAITING_ON_CUSTOMER -> RESOLVED -> CLOSED', () => {
    expect(canTransition('OPEN', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'WAITING_ON_CUSTOMER')).toBe(true);
    expect(canTransition('WAITING_ON_CUSTOMER', 'RESOLVED')).toBe(true);
    expect(canTransition('RESOLVED', 'CLOSED')).toBe(true);
  });

  it('allows the documented loops', () => {
    expect(canTransition('WAITING_ON_CUSTOMER', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('RESOLVED', 'IN_PROGRESS')).toBe(true);
  });

  it('rejects skipping stages', () => {
    expect(canTransition('OPEN', 'RESOLVED')).toBe(false);
    expect(canTransition('OPEN', 'CLOSED')).toBe(false);
    expect(canTransition('OPEN', 'WAITING_ON_CUSTOMER')).toBe(false);
    expect(canTransition('IN_PROGRESS', 'CLOSED')).toBe(false);
  });

  it('treats CLOSED as terminal', () => {
    for (const status of ALL) {
      expect(canTransition('CLOSED', status)).toBe(false);
    }
    expect(TRANSITIONS.CLOSED).toHaveLength(0);
  });

  it('never allows a status to transition to itself', () => {
    for (const status of ALL) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it('gives staff every valid edge', () => {
    for (const status of ALL) {
      expect(allowedTransitionsFor(Role.AGENT, status)).toEqual([...TRANSITIONS[status]]);
      expect(allowedTransitionsFor(Role.ADMIN, status)).toEqual([...TRANSITIONS[status]]);
    }
  });

  it('limits customers to confirming or re-opening a resolved ticket', () => {
    expect(allowedTransitionsFor(Role.CUSTOMER, 'RESOLVED').sort()).toEqual(
      ['CLOSED', 'IN_PROGRESS'].sort(),
    );
    expect(allowedTransitionsFor(Role.CUSTOMER, 'OPEN')).toEqual([]);
    expect(allowedTransitionsFor(Role.CUSTOMER, 'IN_PROGRESS')).toEqual([]);
    expect(allowedTransitionsFor(Role.CUSTOMER, 'WAITING_ON_CUSTOMER')).toEqual([]);
  });

  describe('assertTransition', () => {
    it('throws InvalidTransitionError (422) for edges that do not exist', () => {
      expect(() => assertTransition(Role.AGENT, 'OPEN', 'RESOLVED')).toThrow(InvalidTransitionError);
      try {
        assertTransition(Role.AGENT, 'OPEN', 'CLOSED');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidTransitionError);
        expect((error as InvalidTransitionError).status).toBe(422);
        expect((error as InvalidTransitionError).details).toMatchObject({
          from: 'OPEN',
          to: 'CLOSED',
          allowed: ['IN_PROGRESS'],
        });
      }
    });

    it('throws ForbiddenError (403) when the edge exists but the role may not use it', () => {
      expect(() => assertTransition(Role.CUSTOMER, 'OPEN', 'IN_PROGRESS')).toThrow(ForbiddenError);
    });

    it('lets customers use their permitted edges', () => {
      expect(() => assertTransition(Role.CUSTOMER, 'RESOLVED', 'CLOSED')).not.toThrow();
    });

    it('lets system-driven moves bypass the role check but not the machine', () => {
      expect(() =>
        assertTransition(Role.CUSTOMER, 'WAITING_ON_CUSTOMER', 'IN_PROGRESS', { system: true }),
      ).not.toThrow();
      expect(() => assertTransition(Role.CUSTOMER, 'OPEN', 'CLOSED', { system: true })).toThrow(
        InvalidTransitionError,
      );
    });
  });

  describe('lifecycleTimestamps', () => {
    const now = new Date('2026-10-10T12:00:00.000Z');

    it('stamps resolvedAt when resolving', () => {
      expect(lifecycleTimestamps('IN_PROGRESS', 'RESOLVED', now)).toEqual({ resolvedAt: now });
    });

    it('stamps closedAt when closing', () => {
      expect(lifecycleTimestamps('RESOLVED', 'CLOSED', now)).toEqual({ closedAt: now });
    });

    it('clears resolvedAt when a resolved ticket is re-opened', () => {
      expect(lifecycleTimestamps('RESOLVED', 'IN_PROGRESS', now)).toEqual({ resolvedAt: null });
    });

    it('changes nothing for ordinary moves', () => {
      expect(lifecycleTimestamps('OPEN', 'IN_PROGRESS', now)).toEqual({});
    });
  });
});

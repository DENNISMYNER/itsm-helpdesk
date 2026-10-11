import { env } from '../../config/env';
import { ACTIVE_STATUSES, Role } from '../../domain/enums';
import type { DbClient } from '../../lib/prisma';
import { PRIORITY_WEIGHT, decideAssignment } from './routing.engine';
import type { AgentCandidate, RoutingDecision, RoutingInput } from './routing.types';

/** Arbitrary constant naming the "assign a new ticket" critical section. */
const ASSIGNMENT_LOCK_KEY = 7_301_001;

/**
 * Serialises concurrent ticket creations. Without it, two requests could read the same
 * workload snapshot and pick the same agent. The advisory lock is released automatically
 * when the surrounding transaction commits or rolls back.
 */
export async function lockAssignmentQueue(tx: DbClient): Promise<void> {
  await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${ASSIGNMENT_LOCK_KEY})`);
}

/**
 * Loads the eligible agents with their current priority-weighted workload, asks the pure
 * routing engine for a decision, and records the pick so round-robin keeps rotating.
 * Returns null when no agent exists (the ticket then waits unassigned in the queue).
 */
export async function routeNewTicket(
  tx: DbClient,
  input: RoutingInput,
): Promise<RoutingDecision | null> {
  const agents = await tx.user.findMany({
    where: { role: Role.AGENT, isActive: true },
    select: { id: true, name: true, skills: true, lastAssignedAt: true },
  });
  if (agents.length === 0) return null;

  const workload = await tx.ticket.groupBy({
    by: ['assigneeId', 'priority'],
    where: {
      assigneeId: { in: agents.map((agent) => agent.id) },
      status: { in: [...ACTIVE_STATUSES] },
    },
    _count: { _all: true },
  });

  const loadByAgent = new Map<string, number>();
  for (const row of workload) {
    if (row.assigneeId === null) continue;
    const weight = row._count._all * PRIORITY_WEIGHT[row.priority];
    loadByAgent.set(row.assigneeId, (loadByAgent.get(row.assigneeId) ?? 0) + weight);
  }

  const candidates: AgentCandidate[] = agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    skills: agent.skills,
    lastAssignedAt: agent.lastAssignedAt,
    load: loadByAgent.get(agent.id) ?? 0,
  }));

  const decision = decideAssignment(input, candidates, env.ASSIGNMENT_STRATEGY);
  if (decision) {
    await tx.user.update({
      where: { id: decision.agentId },
      data: { lastAssignedAt: new Date() },
    });
  }
  return decision;
}

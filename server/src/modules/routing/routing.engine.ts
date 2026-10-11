import { TicketCategory, TicketPriority } from '../../domain/enums';
import type {
  AgentCandidate,
  AssignmentStrategy,
  RoutingDecision,
  RoutingInput,
  RoutingRule,
} from './routing.types';

/**
 * Pure routing logic (no database, no clock, no env) so every branch is unit-testable.
 * The service layer feeds it candidates and persists the outcome.
 */

/** How much one active ticket adds to an agent's workload. */
export const PRIORITY_WEIGHT: Readonly<Record<TicketPriority, number>> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 5,
};

/**
 * Ordered rule list - the first rule that matches wins.
 * Each rule says *which pool* to pick from and *how* to choose within it.
 */
export const ROUTING_RULES: readonly RoutingRule[] = [
  {
    id: 'critical-least-active',
    description: 'Critical tickets go to the least-loaded skilled agent',
    matches: (input) => input.priority === TicketPriority.CRITICAL,
    strategy: 'LEAST_ACTIVE',
    requireSkill: true,
  },
  {
    id: 'security-least-active',
    description: 'Security tickets go to the least-loaded security specialist',
    matches: (input) => input.category === TicketCategory.SECURITY,
    strategy: 'LEAST_ACTIVE',
    requireSkill: true,
  },
  {
    id: 'specialist-round-robin',
    description: 'Categorised tickets rotate fairly between matching specialists',
    matches: (input) => input.category !== TicketCategory.OTHER,
    strategy: 'ROUND_ROBIN',
    requireSkill: true,
  },
];

export const DEFAULT_RULE: RoutingRule = {
  id: 'default',
  description: 'Uncategorised tickets use the configured default strategy',
  matches: () => true,
  strategy: 'DEFAULT',
  requireSkill: false,
};

export function resolveRule(input: RoutingInput): RoutingRule {
  return ROUTING_RULES.find((rule) => rule.matches(input)) ?? DEFAULT_RULE;
}

/** Oldest first; agents who were never assigned anything come before everyone else. */
function compareLastAssigned(a: AgentCandidate, b: AgentCandidate): number {
  const left = a.lastAssignedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  const right = b.lastAssignedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function pickLeastActive(candidates: readonly AgentCandidate[]): AgentCandidate | null {
  const sorted = [...candidates].sort(
    (a, b) => a.load - b.load || compareLastAssigned(a, b) || a.id.localeCompare(b.id),
  );
  return sorted[0] ?? null;
}

export function pickRoundRobin(candidates: readonly AgentCandidate[]): AgentCandidate | null {
  const sorted = [...candidates].sort(
    (a, b) => compareLastAssigned(a, b) || a.load - b.load || a.id.localeCompare(b.id),
  );
  return sorted[0] ?? null;
}

const STRATEGIES: Record<
  AssignmentStrategy,
  (candidates: readonly AgentCandidate[]) => AgentCandidate | null
> = {
  LEAST_ACTIVE: pickLeastActive,
  ROUND_ROBIN: pickRoundRobin,
};

/**
 * Chooses an agent for a ticket, or null when there are no candidates at all.
 * If the rule wants a specialist but none exists, falls back to the whole pool
 * (and reports `skillMatched: false`) so tickets never sit unrouted.
 */
export function decideAssignment(
  input: RoutingInput,
  agents: readonly AgentCandidate[],
  defaultStrategy: AssignmentStrategy,
): RoutingDecision | null {
  if (agents.length === 0) return null;

  const rule = resolveRule(input);
  const strategy: AssignmentStrategy = rule.strategy === 'DEFAULT' ? defaultStrategy : rule.strategy;

  const specialists = agents.filter((agent) => agent.skills.includes(input.category));
  const useSpecialists = rule.requireSkill && specialists.length > 0;
  const pool = useSpecialists ? specialists : agents;

  const chosen = STRATEGIES[strategy](pool);
  if (!chosen) return null;

  return {
    agentId: chosen.id,
    agentName: chosen.name,
    ruleId: rule.id,
    strategy,
    skillMatched: specialists.some((agent) => agent.id === chosen.id),
  };
}

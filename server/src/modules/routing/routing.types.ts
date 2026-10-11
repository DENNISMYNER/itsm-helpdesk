import type { TicketCategory, TicketPriority } from '../../domain/enums';

export type AssignmentStrategy = 'LEAST_ACTIVE' | 'ROUND_ROBIN';

/** An agent that may receive a ticket, with the data the strategies need. */
export interface AgentCandidate {
  id: string;
  name: string;
  skills: readonly TicketCategory[];
  /** Last time a ticket was routed to this agent (null = never). */
  lastAssignedAt: Date | null;
  /** Priority-weighted count of the agent's active tickets. */
  load: number;
}

export interface RoutingInput {
  category: TicketCategory;
  priority: TicketPriority;
}

export interface RoutingRule {
  id: string;
  description: string;
  matches: (input: RoutingInput) => boolean;
  /** `DEFAULT` defers to the configured ASSIGNMENT_STRATEGY. */
  strategy: AssignmentStrategy | 'DEFAULT';
  /** Prefer agents whose skills include the ticket category. */
  requireSkill: boolean;
}

export interface RoutingDecision {
  agentId: string;
  agentName: string;
  ruleId: string;
  strategy: AssignmentStrategy;
  /** False when no skilled agent existed and the pool fell back to all agents. */
  skillMatched: boolean;
}

import { PRIORITY_ORDER, Role, TicketPriority, isStaffRole } from '../../domain/enums';

interface EscalationRule {
  pattern: RegExp;
  minimum: TicketPriority;
  reason: string;
}

/** Keyword rules that raise (never lower) the priority of obviously urgent tickets. */
const ESCALATION_RULES: readonly EscalationRule[] = [
  {
    pattern:
      /\b(ransomware|data breach|security breach|breached|compromised (account|laptop|server)|malware outbreak|phishing attack)\b/i,
    minimum: TicketPriority.CRITICAL,
    reason: 'Possible security incident',
  },
  {
    pattern:
      /\b(outage|server (is )?down|system (is )?down|network (is )?down|production (is )?down|all users|entire (office|team|department|company))\b/i,
    minimum: TicketPriority.HIGH,
    reason: 'Possible wide-impact outage',
  },
];

export interface InitialPriority {
  /** What the ticket will be created with. */
  priority: TicketPriority;
  /** What the requester asked for, after role limits. */
  requested: TicketPriority;
  escalated: boolean;
  reason: string | null;
}

const rank = (priority: TicketPriority): number => PRIORITY_ORDER.indexOf(priority);

/**
 * Customers may pick LOW..HIGH; CRITICAL is reserved for staff or the escalation rules.
 * Escalation rules then raise the priority when the text signals an emergency.
 */
export function resolveInitialPriority(
  role: Role,
  requested: TicketPriority,
  title: string,
  description: string,
): InitialPriority {
  const allowed =
    !isStaffRole(role) && requested === TicketPriority.CRITICAL ? TicketPriority.HIGH : requested;

  const text = `${title}\n${description}`;
  let priority = allowed;
  let reason: string | null = null;

  for (const rule of ESCALATION_RULES) {
    if (rule.pattern.test(text) && rank(rule.minimum) > rank(priority)) {
      priority = rule.minimum;
      reason = rule.reason;
    }
  }

  return { priority, requested: allowed, escalated: priority !== allowed, reason };
}

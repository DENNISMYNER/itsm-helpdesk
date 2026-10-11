import {
  ChevronDown,
  ChevronsUp,
  CircleCheck,
  CircleDot,
  CirclePause,
  CirclePlay,
  Equal,
  Lock,
  OctagonAlert,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { PRIORITY_LABEL, STATUS_LABEL } from '../../lib/labels';
import type { TicketPriority, TicketStatus } from '../../types/api';

const STATUS_STYLE: Record<TicketStatus, { icon: LucideIcon; className: string }> = {
  OPEN: { icon: CircleDot, className: 'bg-[var(--st-open-soft)] text-[var(--st-open)]' },
  IN_PROGRESS: { icon: CirclePlay, className: 'bg-[var(--st-progress-soft)] text-[var(--st-progress)]' },
  WAITING_ON_CUSTOMER: { icon: CirclePause, className: 'bg-[var(--st-waiting-soft)] text-[var(--st-waiting)]' },
  RESOLVED: { icon: CircleCheck, className: 'bg-[var(--st-resolved-soft)] text-[var(--st-resolved)]' },
  CLOSED: { icon: Lock, className: 'bg-[var(--st-closed-soft)] text-[var(--st-closed)]' },
};

/** Status chip: icon + text, so the state is never conveyed by colour alone. */
export function StatusBadge({ status, className }: { status: TicketStatus; className?: string }) {
  const { icon: Icon, className: tone } = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tone,
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export const PRIORITY_STYLE: Record<TicketPriority, { icon: LucideIcon; text: string; rail: string }> = {
  CRITICAL: { icon: OctagonAlert, text: 'text-[var(--prio-critical)]', rail: 'bg-[var(--prio-critical)]' },
  HIGH: { icon: ChevronsUp, text: 'text-[var(--prio-high)]', rail: 'bg-[var(--prio-high)]' },
  MEDIUM: { icon: Equal, text: 'text-[var(--prio-medium)]', rail: 'bg-[var(--prio-medium)]' },
  LOW: { icon: ChevronDown, text: 'text-[var(--prio-low)]', rail: 'bg-[var(--prio-low)]' },
};

export function PriorityLabel({ priority, className }: { priority: TicketPriority; className?: string }) {
  const { icon: Icon, text } = PRIORITY_STYLE[priority];
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium', text, className)}>
      <Icon aria-hidden className="size-4" />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

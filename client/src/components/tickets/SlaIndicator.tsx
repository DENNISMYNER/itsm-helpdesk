import { cn } from '../../lib/cn';
import { slaInfo, type SlaState } from '../../lib/format';
import type { TicketSummary } from '../../types/api';

const BAR: Record<SlaState, string> = {
  'on-track': 'bg-[var(--st-resolved)]',
  'at-risk': 'bg-[var(--prio-medium)]',
  overdue: 'bg-[var(--prio-critical)]',
  met: 'bg-[var(--st-resolved)]',
  missed: 'bg-[var(--prio-critical)]',
  none: 'bg-line-strong',
};
const TEXT: Record<SlaState, string> = {
  'on-track': 'text-muted',
  'at-risk': 'text-[var(--prio-medium)] font-medium',
  overdue: 'text-[var(--prio-critical)] font-semibold',
  met: 'text-muted',
  missed: 'text-[var(--prio-critical)]',
  none: 'text-muted',
};

type SlaTicket = Pick<TicketSummary, 'status' | 'createdAt' | 'slaDueAt' | 'resolvedAt'>;

/** A slim bar showing how much of the allowed time is used, plus the text that says it in words. */
export function SlaIndicator({ ticket, now, className }: { ticket: SlaTicket; now: number; className?: string }) {
  const info = slaInfo(ticket, now);
  if (info.state === 'none') return null;
  return (
    <div className={cn('min-w-28', className)}>
      <div
        role="progressbar"
        aria-label="Share of the SLA time used"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(info.elapsed * 100)}
        className="h-1 overflow-hidden rounded-full bg-subtle"
      >
        <div className={cn('h-full rounded-full', BAR[info.state])} style={{ width: `${Math.max(4, info.elapsed * 100)}%` }} />
      </div>
      <p className={cn('mt-1 whitespace-nowrap text-xs', TEXT[info.state])}>{info.label}</p>
    </div>
  );
}

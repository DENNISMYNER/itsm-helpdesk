import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  /** Draws attention to a number that needs action (overdue tickets, unassigned queue). */
  tone?: 'default' | 'warning';
}

export function StatCard({ label, value, hint, tone = 'default' }: Props) {
  return (
    <div className="rounded-lg border border-line bg-panel px-4 py-3.5">
      <p className="text-sm text-muted">{label}</p>
      <p
        className={cn(
          'tabular mt-1 text-2xl font-bold tracking-tight',
          tone === 'warning' && 'text-[var(--prio-critical)]',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

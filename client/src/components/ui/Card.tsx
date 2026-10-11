import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return <section className={cn('rounded-lg border border-line bg-panel', className)} {...rest} />;
}

export function CardHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
      </div>
      {actions}
    </header>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 max-w-prose text-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

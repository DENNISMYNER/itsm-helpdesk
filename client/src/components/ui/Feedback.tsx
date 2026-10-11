import { Inbox, LoaderCircle, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { errorMessage } from '../../lib/api-client';
import { Button } from './Button';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-muted">
      <LoaderCircle aria-hidden className="size-5 animate-spin" />
      <span className="text-sm">{label}...</span>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <Inbox aria-hidden className="size-9 text-faint" />
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Shows what failed and offers a retry, instead of a blank screen. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <TriangleAlert aria-hidden className="size-9 text-danger" />
      <h3 className="mt-3 text-base font-semibold">This could not be loaded</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{errorMessage(error)}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Inline banner for failed actions (a form submit, a status change). */
export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-md border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-danger"
    >
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{errorMessage(error)}</span>
    </div>
  );
}

import { cn } from '../../lib/cn';
import { initials } from '../../lib/format';

/** Initials in a neutral circle (no external images, nothing to load). */
export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex size-8 shrink-0 select-none items-center justify-center rounded-full',
        'bg-brand-soft text-xs font-semibold text-brand',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

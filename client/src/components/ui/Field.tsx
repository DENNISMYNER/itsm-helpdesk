import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

/** Visual style shared by every form control, without any width so callers can size it freely. */
export const controlBaseClass =
  'rounded-md border border-line-strong bg-panel px-3 text-sm text-ink placeholder:text-faint ' +
  'hover:border-faint disabled:cursor-not-allowed disabled:opacity-60';

/** Full-width control (the default in forms). Use `controlBaseClass` + your own width otherwise. */
export const controlClass = `w-full ${controlBaseClass}`;

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string | undefined;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

function FieldShell({ label, hint, error, children }: FieldShellProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error ?? hint);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children({ id, describedBy: hasMessage ? messageId : undefined, invalid: Boolean(error) })}
      {hasMessage ? (
        <p id={messageId} className={cn('text-sm', error ? 'text-danger' : 'text-muted')}>
          {error ?? hint}
        </p>
      ) : null}
    </div>
  );
}

type SharedProps = { label: string; hint?: string; error?: string | undefined };

export function TextField({
  label,
  hint,
  error,
  className,
  ...rest
}: SharedProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} {...(hint ? { hint } : {})} error={error}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClass, 'h-10', invalid && 'border-danger', className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  ...rest
}: SharedProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} {...(hint ? { hint } : {})} error={error}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClass, 'min-h-28 resize-y py-2.5', invalid && 'border-danger', className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...rest
}: SharedProps & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <FieldShell label={label} {...(hint ? { hint } : {})} error={error}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(controlClass, 'h-10', invalid && 'border-danger', className)}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}

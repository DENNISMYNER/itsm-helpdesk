import { Send } from 'lucide-react';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { ErrorBanner } from '../ui/Feedback';
import { controlClass } from '../ui/Field';

interface Props {
  /** Staff may switch to internal notes. */
  canWriteInternal: boolean;
  disabled?: boolean;
  disabledReason?: string;
  sending: boolean;
  error: unknown;
  onTyping: () => void;
  onSend: (input: { body: string; isInternal: boolean }) => Promise<unknown>;
}

const MAX_LENGTH = 4000;

export function MessageComposer({ canWriteInternal, disabled, disabledReason, sending, error, onTyping, onSend }: Props) {
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);

  if (disabled) {
    return <p className="border-t border-line bg-subtle/60 px-5 py-4 text-sm text-muted">{disabledReason}</p>;
  }

  const submit = async () => {
    const text = body.trim();
    if (!text || sending) return;
    try {
      await onSend({ body: text, isInternal: internal });
      setBody('');
    } catch {
      // The error is shown by <ErrorBanner>; the draft stays in the box so nothing is lost.
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3 border-t border-line px-4 py-4 sm:px-5">
      {canWriteInternal ? (
        <div role="tablist" aria-label="Message type" className="inline-flex rounded-md border border-line bg-subtle p-0.5 text-sm">
          {[
            { value: false, label: 'Reply to customer' },
            { value: true, label: 'Internal note' },
          ].map((option) => (
            <button
              key={option.label}
              type="button"
              role="tab"
              aria-selected={internal === option.value}
              onClick={() => setInternal(option.value)}
              className={cn(
                'rounded px-3 py-1 font-medium',
                internal === option.value ? 'bg-panel text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      <textarea
        value={body}
        maxLength={MAX_LENGTH}
        rows={3}
        onChange={(event) => {
          setBody(event.target.value);
          if (!internal) onTyping();
        }}
        onKeyDown={onKeyDown}
        aria-label={internal ? 'Internal note' : 'Message'}
        placeholder={internal ? 'Write a note for the support team only...' : 'Write a message...'}
        className={cn(controlClass, 'resize-y py-2.5', internal && 'border-dashed border-[var(--prio-medium)]')}
      />

      <ErrorBanner error={error} />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">Press Ctrl+Enter to send</p>
        <Button type="submit" loading={sending} disabled={!body.trim()} icon={<Send aria-hidden className="size-4" />}>
          {internal ? 'Add note' : 'Send message'}
        </Button>
      </div>
    </form>
  );
}

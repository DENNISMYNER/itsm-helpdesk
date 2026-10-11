import { STATUS_ACTION_LABEL } from '../../lib/labels';
import type { TicketStatus } from '../../types/api';
import { Button } from '../ui/Button';

interface Props {
  /** Exactly the moves the server says this user may make right now (state machine + role). */
  allowed: TicketStatus[];
  pending: TicketStatus | null;
  onChange: (status: TicketStatus) => void;
}

/**
 * Buttons are generated from `allowedTransitions`, so the UI can never offer a move the
 * state machine would reject. The first option is the natural "next step" and is emphasised.
 */
export function StatusActions({ allowed, pending, onChange }: Props) {
  if (allowed.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Change ticket status">
      {allowed.map((status, index) => (
        <Button
          key={status}
          size="sm"
          variant={index === 0 ? 'primary' : 'secondary'}
          loading={pending === status}
          disabled={pending !== null && pending !== status}
          onClick={() => onChange(status)}
        >
          {STATUS_ACTION_LABEL[status]}
        </Button>
      ))}
    </div>
  );
}

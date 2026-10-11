import { AppError, ConflictError, InvalidTransitionError } from './errors';

/** Markers raised by the PostgreSQL guard triggers (see the `db_guards` migration). */
const MARKER = {
  invalidTransition: 'INVALID_STATUS_TRANSITION',
  invalidInitialStatus: 'INVALID_INITIAL_STATUS',
  immutableAudit: 'AUDIT_LOG_IMMUTABLE',
} as const;

/** Driver adapters wrap the original PostgreSQL error, so walk the `cause` chain. */
function collectMessages(error: unknown): string[] {
  const messages: string[] = [];
  let current: unknown = error;
  for (let depth = 0; depth < 6 && current !== undefined && current !== null; depth += 1) {
    if (typeof current === 'string') {
      messages.push(current);
      break;
    }
    if (typeof current !== 'object') break;
    const { message, cause } = current as { message?: unknown; cause?: unknown };
    if (typeof message === 'string') messages.push(message);
    current = cause;
  }
  return messages;
}

function findMessage(error: unknown, marker: string): string | undefined {
  return collectMessages(error).find((message) => message.includes(marker));
}

/**
 * Converts a violation raised by one of the database guard triggers into a typed
 * application error. Anything else is returned untouched so callers can rethrow it.
 */
export function translateDbError(error: unknown): unknown {
  if (error instanceof AppError) return error;

  const transition = findMessage(error, MARKER.invalidTransition);
  if (transition !== undefined) {
    const match = /INVALID_STATUS_TRANSITION:\s*(\w+)\s*->\s*(\w+)/.exec(transition);
    return new InvalidTransitionError(match?.[1] ?? 'UNKNOWN', match?.[2] ?? 'UNKNOWN', []);
  }

  if (findMessage(error, MARKER.invalidInitialStatus) !== undefined) {
    return new ConflictError('New tickets must start as OPEN', MARKER.invalidInitialStatus);
  }

  if (findMessage(error, MARKER.immutableAudit) !== undefined) {
    return new ConflictError('Audit log entries are immutable', MARKER.immutableAudit);
  }

  return error;
}

import { describe, expect, it } from 'vitest';
import { translateDbError } from '../../src/lib/db-errors';
import { AppError, ConflictError, InvalidTransitionError } from '../../src/lib/errors';

describe('translateDbError', () => {
  it('maps the status-transition trigger to InvalidTransitionError', () => {
    const error = translateDbError(new Error('INVALID_STATUS_TRANSITION: OPEN -> RESOLVED'));
    expect(error).toBeInstanceOf(InvalidTransitionError);
    expect((error as InvalidTransitionError).details).toMatchObject({ from: 'OPEN', to: 'RESOLVED' });
  });

  it('finds markers nested in the cause chain (driver adapters wrap errors)', () => {
    const wrapped = new Error('Query failed', {
      cause: new Error('error: INVALID_STATUS_TRANSITION: CLOSED -> OPEN'),
    });
    expect(translateDbError(wrapped)).toBeInstanceOf(InvalidTransitionError);
  });

  it('maps audit-log tampering and bad initial status to conflicts', () => {
    const audit = translateDbError(new Error('AUDIT_LOG_IMMUTABLE: UPDATE on audit_logs is not allowed'));
    expect(audit).toBeInstanceOf(ConflictError);
    expect((audit as AppError).code).toBe('AUDIT_LOG_IMMUTABLE');

    const initial = translateDbError(new Error('INVALID_INITIAL_STATUS: new tickets must start as OPEN'));
    expect((initial as AppError).code).toBe('INVALID_INITIAL_STATUS');
  });

  it('leaves unrelated errors and AppErrors untouched', () => {
    const unrelated = new Error('connection reset');
    expect(translateDbError(unrelated)).toBe(unrelated);
    const app = new ConflictError('x');
    expect(translateDbError(app)).toBe(app);
    expect(translateDbError('boom')).toBe('boom');
  });
});

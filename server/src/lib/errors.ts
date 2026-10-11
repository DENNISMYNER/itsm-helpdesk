/**
 * Application errors carry an HTTP status and a stable machine-readable `code`
 * so clients can branch on `code` instead of parsing messages.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST', details?: unknown) {
    super(400, code, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action', code = 'FORBIDDEN') {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(
    message = 'The request conflicts with the current state',
    code = 'CONFLICT',
    details?: unknown,
  ) {
    super(409, code, message, details);
  }
}

/** The requested status change is not an edge of the ticket state machine. */
export class InvalidTransitionError extends AppError {
  constructor(from: string, to: string, allowed: readonly string[]) {
    super(422, 'INVALID_STATUS_TRANSITION', `A ticket cannot move from ${from} to ${to}`, {
      from,
      to,
      allowed: [...allowed],
    });
  }
}

import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { translateDbError } from '../lib/db-errors';
import { AppError, NotFoundError } from '../lib/errors';
import { logger } from '../lib/logger';

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export const notFoundHandler: RequestHandler = () => {
  throw new NotFoundError('Route not found');
};

function prismaCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const { code } = error as { code: unknown };
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

export const errorHandler: ErrorRequestHandler = (rawError, req, res, _next) => {
  const error = translateDbError(rawError);

  if (res.headersSent) {
    logger.error({ err: error }, 'Error after headers were sent');
    return;
  }

  if (error instanceof ZodError) {
    const body: ErrorBody = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request contains invalid data',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    };
    res.status(400).json(body);
    return;
  }

  if (error instanceof AppError) {
    const body: ErrorBody = {
      error: { code: error.code, message: error.message, details: error.details },
    };
    res.status(error.status).json(body);
    return;
  }

  // Prisma: unique constraint / record not found
  const code = prismaCode(error);
  if (code === 'P2002') {
    res.status(409).json({
      error: { code: 'CONFLICT', message: 'A record with these values already exists' },
    } satisfies ErrorBody);
    return;
  }
  if (code === 'P2025') {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    } satisfies ErrorBody);
    return;
  }

  // Malformed JSON bodies surface from express.json as SyntaxError with status 400.
  if (
    error instanceof SyntaxError &&
    'status' in error &&
    (error as { status?: unknown }).status === 400
  ) {
    res.status(400).json({
      error: { code: 'BAD_REQUEST', message: 'Malformed JSON body' },
    } satisfies ErrorBody);
    return;
  }

  logger.error({ err: error, method: req.method, url: req.originalUrl }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'Something went wrong' : String((error as Error)?.message ?? error),
    },
  } satisfies ErrorBody);
};

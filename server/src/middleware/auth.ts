import type { Request, RequestHandler } from 'express';
import type { Role } from '../domain/enums';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';
import { AUTH_COOKIE, verifyToken } from '../lib/tokens';
import { findAuthUserById } from '../modules/auth/auth.service';
import type { AuthUser } from '../modules/auth/auth.types';

/**
 * Resolves the session cookie to a live, active user. The user is re-read on every
 * request so deactivating an account (or changing its role) takes effect immediately.
 * Express 5 forwards rejected promises to the error handler, so throwing is safe here.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const userId = verifyToken(cookies?.[AUTH_COOKIE]);
  if (!userId) throw new UnauthorizedError();

  const user = await findAuthUserById(userId);
  if (!user) throw new UnauthorizedError('Session is no longer valid');

  req.user = user;
  next();
};

/** Allows only the listed roles. Must run after `authenticate`. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    const user = getAuthUser(req);
    if (!roles.includes(user.role)) throw new ForbiddenError();
    next();
  };
}

/** Typed accessor that avoids non-null assertions in controllers. */
export function getAuthUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}

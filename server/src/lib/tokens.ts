import type { CookieOptions, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env, isProduction } from '../config/env';
import type { AuthUser } from '../modules/auth/auth.types';

/** Name of the httpOnly cookie that carries the session token. */
export const AUTH_COOKIE = 'itsm_token';

const SESSION_SECONDS = env.JWT_EXPIRES_IN_HOURS * 60 * 60;

const cookieOptions: CookieOptions = {
  httpOnly: true, // not readable from JavaScript, which limits the damage of XSS
  sameSite: 'lax', // not sent on cross-site subrequests, which mitigates CSRF
  secure: isProduction,
  path: '/',
};

/** Signs a short-lived session token. Only the user id is embedded; everything else is re-read per request. */
export function signToken(user: Pick<AuthUser, 'id'>): string {
  return jwt.sign({}, env.JWT_SECRET, {
    subject: user.id,
    algorithm: 'HS256',
    expiresIn: SESSION_SECONDS,
  });
}

/** Returns the user id carried by a valid, unexpired token, or null for anything else. */
export function verifyToken(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: SESSION_SECONDS * 1000 });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, cookieOptions);
}

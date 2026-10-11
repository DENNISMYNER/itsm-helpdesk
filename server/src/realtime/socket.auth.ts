import { parseCookie } from 'cookie';
import { UnauthorizedError } from '../lib/errors';
import { AUTH_COOKIE, verifyToken } from '../lib/tokens';
import { findAuthUserById } from '../modules/auth/auth.service';
import type { AuthUser } from '../modules/auth/auth.types';
import type { AppSocket } from './socket.types';

/**
 * Authenticates a WebSocket handshake with the same httpOnly session cookie the REST API
 * uses, so the browser never has to expose a token to JavaScript.
 */
export async function authenticateSocket(socket: AppSocket): Promise<AuthUser> {
  const header = socket.handshake.headers.cookie;
  const cookies = header ? parseCookie(header) : {};
  const userId = verifyToken(cookies[AUTH_COOKIE]);
  if (!userId) throw new UnauthorizedError();

  const user = await findAuthUserById(userId);
  if (!user) throw new UnauthorizedError('Session is no longer valid');
  return user;
}

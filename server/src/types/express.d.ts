import type { AuthUser } from '../modules/auth/auth.types';

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware. */
      user?: AuthUser;
    }
  }
}

export {};

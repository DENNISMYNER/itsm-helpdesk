import type { Request, Response } from 'express';
import { clearAuthCookie, setAuthCookie, signToken } from '../../lib/tokens';
import { getAuthUser } from '../../middleware/auth';
import { loginSchema, registerSchema } from './auth.schemas';
import { authenticateUser, registerCustomer } from './auth.service';

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body);
  const user = await registerCustomer(input);
  setAuthCookie(res, signToken(user));
  res.status(201).json({ user });
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const user = await authenticateUser(input);
  setAuthCookie(res, signToken(user));
  res.json({ user });
}

export function logoutHandler(_req: Request, res: Response): void {
  clearAuthCookie(res);
  res.status(204).end();
}

export function meHandler(req: Request, res: Response): void {
  res.json({ user: getAuthUser(req) });
}

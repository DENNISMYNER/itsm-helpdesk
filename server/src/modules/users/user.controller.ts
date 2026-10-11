import type { Request, Response } from 'express';
import { idParamSchema } from '../../lib/http';
import { getAuthUser } from '../../middleware/auth';
import { listUsersQuerySchema, updateUserSchema } from './user.schemas';
import { listAssignableStaff, listUsers, updateUser } from './user.service';

export async function listStaffHandler(_req: Request, res: Response): Promise<void> {
  res.json({ items: await listAssignableStaff() });
}

export async function listUsersHandler(req: Request, res: Response): Promise<void> {
  const query = listUsersQuerySchema.parse(req.query);
  res.json(await listUsers(query));
}

export async function updateUserHandler(req: Request, res: Response): Promise<void> {
  const actor = getAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  const input = updateUserSchema.parse(req.body);
  res.json({ user: await updateUser(actor, id, input) });
}

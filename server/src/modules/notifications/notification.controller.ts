import type { Request, Response } from 'express';
import { idParamSchema } from '../../lib/http';
import { getAuthUser } from '../../middleware/auth';
import { getInbox, markAllRead, markRead } from './notification.service';

export async function getInboxHandler(req: Request, res: Response): Promise<void> {
  const user = getAuthUser(req);
  res.json(await getInbox(user.id));
}

export async function markReadHandler(req: Request, res: Response): Promise<void> {
  const user = getAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  await markRead(user.id, id);
  res.status(204).end();
}

export async function markAllReadHandler(req: Request, res: Response): Promise<void> {
  const user = getAuthUser(req);
  await markAllRead(user.id);
  res.status(204).end();
}

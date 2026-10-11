import type { Request, Response } from 'express';
import { idParamSchema } from '../../lib/http';
import { getAuthUser } from '../../middleware/auth';
import { postMessageSchema } from './message.schemas';
import { postMessage } from './message.service';

export async function postMessageHandler(req: Request, res: Response): Promise<void> {
  const actor = getAuthUser(req);
  const { id } = idParamSchema.parse(req.params);
  const input = postMessageSchema.parse(req.body);
  res.status(201).json({ message: await postMessage(actor, id, input) });
}

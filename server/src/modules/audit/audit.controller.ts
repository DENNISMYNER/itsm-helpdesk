import type { Request, Response } from 'express';
import { listAuditLog } from './audit.service';
import { listAuditQuerySchema } from './audit.schemas';

export async function listAuditLogHandler(req: Request, res: Response): Promise<void> {
  const query = listAuditQuerySchema.parse(req.query);
  res.json(await listAuditLog(query));
}

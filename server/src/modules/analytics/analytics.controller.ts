import type { Request, Response } from 'express';
import { overviewQuerySchema } from './analytics.schemas';
import { getOverview } from './analytics.service';

export async function overviewHandler(req: Request, res: Response): Promise<void> {
  const { days } = overviewQuerySchema.parse(req.query);
  res.json(await getOverview(days));
}

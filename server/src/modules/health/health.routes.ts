import { Router } from 'express';
import { logger } from '../../lib/logger';
import { prisma } from '../../lib/prisma';

export const healthRouter = Router();

/** Liveness + database reachability, for load balancers and uptime checks. */
healthRouter.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', uptimeSeconds: Math.round(process.uptime()) });
  } catch (error) {
    logger.error({ err: error }, 'Health check failed');
    res.status(503).json({ status: 'unavailable' });
  }
});

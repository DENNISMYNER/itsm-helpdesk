import { Router } from 'express';
import { Role } from '../../domain/enums';
import { authenticate, requireRole } from '../../middleware/auth';
import { overviewHandler } from './analytics.controller';

export const analyticsRouter = Router();

analyticsRouter.get('/overview', authenticate, requireRole(Role.AGENT, Role.ADMIN), overviewHandler);

import { Router } from 'express';
import { Role } from '../../domain/enums';
import { authenticate, requireRole } from '../../middleware/auth';
import { listAuditLogHandler } from './audit.controller';

export const auditRouter = Router();

// The global activity stream is an admin-only view; per-ticket history lives under /tickets/:id/activity.
auditRouter.get('/', authenticate, requireRole(Role.ADMIN), listAuditLogHandler);

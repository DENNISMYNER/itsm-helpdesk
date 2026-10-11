import { Router } from 'express';
import { analyticsRouter } from '../modules/analytics/analytics.routes';
import { auditRouter } from '../modules/audit/audit.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { healthRouter } from '../modules/health/health.routes';
import { notificationRouter } from '../modules/notifications/notification.routes';
import { ticketRouter } from '../modules/tickets/ticket.routes';
import { userRouter } from '../modules/users/user.routes';

/** Every HTTP endpoint lives under /api. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/tickets', ticketRouter);
apiRouter.use('/analytics', analyticsRouter);
apiRouter.use('/audit', auditRouter);
apiRouter.use('/notifications', notificationRouter);

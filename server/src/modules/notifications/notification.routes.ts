import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { getInboxHandler, markAllReadHandler, markReadHandler } from './notification.controller';

export const notificationRouter = Router();

notificationRouter.use(authenticate);
notificationRouter.get('/', getInboxHandler);
notificationRouter.post('/read-all', markAllReadHandler);
notificationRouter.post('/:id/read', markReadHandler);

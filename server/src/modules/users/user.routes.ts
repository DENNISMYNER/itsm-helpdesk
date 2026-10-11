import { Router } from 'express';
import { Role } from '../../domain/enums';
import { authenticate, requireRole } from '../../middleware/auth';
import { listStaffHandler, listUsersHandler, updateUserHandler } from './user.controller';

export const userRouter = Router();

userRouter.use(authenticate);

// Staff directory (assignee picker).
userRouter.get('/staff', requireRole(Role.AGENT, Role.ADMIN), listStaffHandler);

// User administration.
userRouter.get('/', requireRole(Role.ADMIN), listUsersHandler);
userRouter.patch('/:id', requireRole(Role.ADMIN), updateUserHandler);

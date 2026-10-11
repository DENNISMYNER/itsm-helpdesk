import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rate-limit';
import { loginHandler, logoutHandler, meHandler, registerHandler } from './auth.controller';

export const authRouter = Router();

authRouter.post('/register', authLimiter, registerHandler);
authRouter.post('/login', authLimiter, loginHandler);
authRouter.post('/logout', logoutHandler);
authRouter.get('/me', authenticate, meHandler);

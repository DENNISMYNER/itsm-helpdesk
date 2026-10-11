import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env';

const WINDOW_MS = 15 * 60 * 1000;
const skipInTests = (): boolean => env.NODE_ENV === 'test';

const message = (text: string) => ({ error: { code: 'RATE_LIMITED', message: text } });

/** Generous ceiling for the whole API. */
export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 1500,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: skipInTests,
  message: message('Too many requests. Please slow down.'),
});

/** Tight limit on credential endpoints to slow down password guessing. */
export const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: skipInTests,
  message: message('Too many sign-in attempts. Try again in a few minutes.'),
});

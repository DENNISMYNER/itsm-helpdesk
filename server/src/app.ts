import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env, isProduction } from './config/env';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { apiLimiter } from './middleware/rate-limit';
import { apiRouter } from './routes';

/** Builds the Express application. Kept separate from `server.ts` so tests can mount it. */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // Behind a reverse proxy / load balancer the real client IP is needed for rate limiting.
  if (isProduction) app.set('trust proxy', 1);

  app.use(
    pinoHttp({
      logger,
      // Health checks would drown the log.
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/api', apiLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

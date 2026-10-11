import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { assertStatusMachineInSync } from './modules/tickets/ticket.state-machine.sync';
import { createRealtimeServer } from './realtime/socket.server';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function main(): Promise<void> {
  await prisma.$connect();
  await assertStatusMachineInSync();

  const httpServer = createServer(createApp());
  const realtime = createRealtimeServer(httpServer);

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(env.PORT, resolve);
  });
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'ITSM API is listening');

  let shuttingDown = false;
  const shutdown = (signal: string): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    // Last resort so a stuck connection can never keep the process alive forever.
    setTimeout(() => process.exit(1), SHUTDOWN_TIMEOUT_MS).unref();

    realtime
      .close()
      .then(() => prisma.$disconnect())
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Error during shutdown');
        process.exit(1);
      });
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

// A rejected promise nobody handled is a bug; crash loudly and let the supervisor restart us.
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});

main().catch((error: unknown) => {
  logger.fatal({ err: error }, 'Failed to start the server');
  process.exit(1);
});

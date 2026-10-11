import type { DomainEvent } from '../../events/domain-events';
import { eventBus } from '../../events/event-bus';
import { translateDbError } from '../../lib/db-errors';
import { prisma, type DbClient } from '../../lib/prisma';
import type { AuthUser } from '../auth/auth.types';

/** Everything a command needs while it runs inside a database transaction. */
export interface CommandContext {
  tx: DbClient;
  actor: AuthUser;
  /** Collected during the transaction, published only after it commits. */
  events: DomainEvent[];
}

const TRANSACTION_TIMEOUT_MS = 10_000;

/**
 * Runs `work` atomically. Domain events are published after the commit so clients never
 * hear about changes that were rolled back, and database guard violations (state machine,
 * audit immutability) surface as typed application errors.
 */
export async function runCommand<T>(
  actor: AuthUser,
  work: (ctx: CommandContext) => Promise<T>,
): Promise<T> {
  const events: DomainEvent[] = [];
  let result: T;
  try {
    result = await prisma.$transaction(async (tx) => work({ tx, actor, events }), {
      timeout: TRANSACTION_TIMEOUT_MS,
    });
  } catch (error) {
    throw translateDbError(error);
  }
  eventBus.publish(events);
  return result;
}

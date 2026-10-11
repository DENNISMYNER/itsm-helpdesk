import { TicketStatus } from '../../domain/enums';
import { prisma } from '../../lib/prisma';
import { TRANSITIONS } from './ticket.state-machine';

/**
 * The state machine exists twice on purpose: in code (fast feedback, friendly errors) and in
 * PostgreSQL (the last line of defence). Failing fast at start-up when the two disagree
 * prevents a deploy where, say, the API allows a move the database then rejects.
 */
export async function assertStatusMachineInSync(): Promise<void> {
  const rows = await prisma.statusTransition.findMany({
    select: { fromStatus: true, toStatus: true },
  });
  const inDatabase = new Set(rows.map((row) => `${row.fromStatus} -> ${row.toStatus}`));
  const inCode = new Set(
    Object.values(TicketStatus).flatMap((from) =>
      TRANSITIONS[from].map((to) => `${from} -> ${to}`),
    ),
  );

  const missing = [...inCode].filter((edge) => !inDatabase.has(edge));
  const unexpected = [...inDatabase].filter((edge) => !inCode.has(edge));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      'Ticket state machine is out of sync with the database. ' +
        `Missing in database: [${missing.join(', ')}]. ` +
        `Unexpected in database: [${unexpected.join(', ')}]. Run the latest migrations.`,
    );
  }
}

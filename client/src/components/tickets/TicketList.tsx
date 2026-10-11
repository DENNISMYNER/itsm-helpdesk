import { useRecentlyChanged } from '../../context/LiveSyncContext';
import { useNow } from '../../hooks/useNow';
import type { TicketSummary } from '../../types/api';
import { TicketListHeader, TicketRow } from './TicketRow';

export function TicketList({ tickets, staff }: { tickets: TicketSummary[]; staff: boolean }) {
  const now = useNow();
  const changed = useRecentlyChanged();
  return (
    <>
      <div className="hidden lg:block">
        <TicketListHeader />
      </div>
      <ul className="divide-y divide-line">
        {tickets.map((ticket) => (
          <TicketRow key={ticket.id} ticket={ticket} now={now} staff={staff} highlighted={changed.has(ticket.id)} />
        ))}
      </ul>
    </>
  );
}

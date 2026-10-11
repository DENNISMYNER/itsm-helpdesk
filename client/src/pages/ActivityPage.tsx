import { useState } from 'react';
import { Link } from 'react-router';
import { describeEntry } from '../components/tickets/ActivityTimeline';
import { Card, PageHeader } from '../components/ui/Card';
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback';
import { controlClass } from '../components/ui/Field';
import { Pagination } from '../components/ui/Pagination';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useAuditLog } from '../hooks/useAdminData';
import { cn } from '../lib/cn';
import { formatDateTime } from '../lib/format';
import { ACTION_LABEL, ticketRef } from '../lib/labels';
import { AUDIT_ACTIONS, type AuditAction } from '../types/api';

export function ActivityPage() {
  const [action, setAction] = useState<AuditAction | ''>('');
  const [ticketText, setTicketText] = useState('');
  const [page, setPage] = useState(1);
  // Accept "1042", "#1042" and "ITSM-1042"; anything else is ignored rather than sent to the API.
  const digits = /^(?:itsm-|#)?(\d{1,9})$/i.exec(useDebouncedValue(ticketText.trim(), 300))?.[1] ?? '';

  const log = useAuditLog({ page, action: action ? [action] : [], ticketNumber: digits });
  const data = log.data;

  return (
    <>
      <PageHeader
        title="Activity log"
        description="A permanent record of every ticket creation, status change, assignment and note. Entries cannot be edited or deleted."
      />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-line px-4 py-4 sm:px-5">
          <input
            type="search"
            value={ticketText}
            onChange={(event) => {
              setTicketText(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by ticket number"
            placeholder="Ticket number, e.g. ITSM-1042"
            className={cn(controlClass, 'h-10 min-w-56 flex-1')}
          />
          <select
            aria-label="Filter by action"
            value={action}
            onChange={(event) => {
              setAction(event.target.value as AuditAction | '');
              setPage(1);
            }}
            className={cn(controlClass, 'h-10 w-auto min-w-48')}
          >
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((value) => (
              <option key={value} value={value}>
                {ACTION_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

        {log.isPending ? <Spinner label="Loading activity" /> : null}
        {log.isError ? <ErrorState error={log.error} onRetry={() => void log.refetch()} /> : null}
        {data && data.items.length === 0 ? <EmptyState title="No matching activity" description="Try another ticket number or action." /> : null}

        {data && data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-line">
              {data.items.map((entry) => (
                <li key={entry.id} className="px-4 py-3 sm:px-5">
                  <p className="text-sm">{describeEntry(entry)}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    <Link to={`/tickets/${entry.ticketId}`} className="tabular font-medium text-brand hover:underline">
                      {ticketRef(entry.ticket.number)}
                    </Link>{' '}
                    · {entry.ticket.title} · {formatDateTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onChange={setPage} />
          </>
        ) : null}
      </Card>
    </>
  );
}

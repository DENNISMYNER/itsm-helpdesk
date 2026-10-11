import { Plus } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { TicketFilters } from '../api/tickets.api';
import { TicketFilterBar } from '../components/tickets/TicketFilters';
import { TicketList } from '../components/tickets/TicketList';
import { Button } from '../components/ui/Button';
import { Card, PageHeader } from '../components/ui/Card';
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback';
import { Pagination } from '../components/ui/Pagination';
import { useCurrentUser } from '../context/AuthContext';
import { useTicketList } from '../hooks/useTickets';
import { isStaff } from '../lib/labels';
import { filtersFromParams, filtersToParams, hasActiveFilters } from '../lib/ticket-filters';

const PAGE_SIZE = 15;

export function TicketsPage() {
  const user = useCurrentUser();
  const staff = isStaff(user.role);
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => filtersFromParams(params), [params]);

  const setFilters = useCallback(
    (next: TicketFilters) => setParams(filtersToParams(next), { replace: true }),
    [setParams],
  );

  const query = useTicketList(filters);
  const page = query.data;

  return (
    <>
      <PageHeader
        title={staff ? 'Ticket queue' : 'My tickets'}
        description={
          staff
            ? 'Every open request, newest and most urgent first. Changes appear here as they happen.'
            : 'Everything you have asked support for, and where it stands.'
        }
        actions={
          <Link to="/tickets/new">
            <Button icon={<Plus aria-hidden className="size-4" />}>New ticket</Button>
          </Link>
        }
      />

      <Card>
        <TicketFilterBar filters={filters} onChange={setFilters} staff={staff} />

        {query.isPending ? <Spinner label="Loading tickets" /> : null}
        {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}

        {page && page.items.length === 0 ? (
          hasActiveFilters(filters) ? (
            <EmptyState title="No tickets match these filters" description="Try removing a filter or searching for something else." />
          ) : (
            <EmptyState
              title={staff ? 'The queue is empty' : "You haven't opened any tickets"}
              description={staff ? 'New requests will show up here the moment they arrive.' : 'Describe a problem and the support team will pick it up.'}
              action={
                staff ? undefined : (
                  <Link to="/tickets/new">
                    <Button>Open a ticket</Button>
                  </Link>
                )
              }
            />
          )
        ) : null}

        {page && page.items.length > 0 ? (
          <>
            <TicketList tickets={page.items} staff={staff} />
            <Pagination
              page={page.page}
              totalPages={page.totalPages}
              total={page.total}
              pageSize={PAGE_SIZE}
              onChange={(next) => setFilters({ ...filters, page: next })}
            />
          </>
        ) : null}
      </Card>
    </>
  );
}

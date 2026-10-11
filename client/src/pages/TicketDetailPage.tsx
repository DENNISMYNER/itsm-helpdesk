import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { ActivityTimeline } from '../components/tickets/ActivityTimeline';
import { PriorityLabel, StatusBadge } from '../components/tickets/badges';
import { ChatThread } from '../components/tickets/ChatThread';
import { MessageComposer } from '../components/tickets/MessageComposer';
import { StatusActions } from '../components/tickets/StatusActions';
import { TicketDetailsPanel } from '../components/tickets/TicketDetailsPanel';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState, ErrorBanner, ErrorState, Spinner } from '../components/ui/Feedback';
import { useCurrentUser } from '../context/AuthContext';
import { useTicketRoom } from '../hooks/useTicketRoom';
import { useTicket, useTicketActivity, useTicketMutations } from '../hooks/useTickets';
import { ApiError } from '../lib/api-client';
import { isStaff, ticketRef } from '../lib/labels';
import type { TicketDetail } from '../types/api';

export function TicketDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const query = useTicket(id);

  if (query.isPending) return <Spinner label="Loading ticket" />;
  if (query.isError) {
    if (query.error instanceof ApiError && query.error.status === 404) {
      return (
        <EmptyState
          title="Ticket not found"
          description="It may have been removed, or it belongs to someone else."
          action={
            <Link to="/tickets" className="text-sm font-semibold text-brand hover:underline">
              Back to tickets
            </Link>
          }
        />
      );
    }
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }
  return <TicketView ticket={query.data} />;
}

function TicketView({ ticket }: { ticket: TicketDetail }) {
  const user = useCurrentUser();
  const staff = isStaff(user.role);
  const { typingNames, signalTyping, stopTyping } = useTicketRoom(ticket.id);
  const mutations = useTicketMutations(ticket.id);
  const activity = useTicketActivity(ticket.id, staff);

  const closed = ticket.status === 'CLOSED';
  const actionError =
    mutations.changeStatus.error ?? mutations.assign.error ?? mutations.changePriority.error ?? null;
  const busy = mutations.assign.isPending || mutations.changePriority.isPending || mutations.changeStatus.isPending;

  return (
    <>
      <Link to="/tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <ArrowLeft aria-hidden className="size-4" />
        All tickets
      </Link>

      <header className="mb-6">
        <p className="tabular text-sm font-medium text-muted">{ticketRef(ticket.number)}</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight">{ticket.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
          <StatusBadge status={ticket.status} />
          <PriorityLabel priority={ticket.priority} />
          <StatusActions
            allowed={ticket.allowedTransitions}
            pending={mutations.changeStatus.isPending ? (mutations.changeStatus.variables ?? null) : null}
            onChange={(status) => mutations.changeStatus.mutate(status)}
          />
        </div>
        {actionError ? (
          <div className="mt-3 max-w-2xl">
            <ErrorBanner error={actionError} />
          </div>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Description" />
            <p className="whitespace-pre-wrap break-words px-4 py-4 sm:px-5">{ticket.description}</p>
          </Card>

          <Card>
            <CardHeader title="Conversation" description={staff ? 'Replies reach the customer instantly. Internal notes stay with the team.' : 'Messages from the support team appear here as soon as they are sent.'} />
            <ChatThread messages={ticket.messages} currentUserId={user.id} typingNames={typingNames} />
            <MessageComposer
              canWriteInternal={staff}
              disabled={closed}
              disabledReason="This ticket is closed. Open a new ticket if you still need help."
              sending={mutations.postMessage.isPending}
              error={mutations.postMessage.error}
              onTyping={signalTyping}
              onSend={async (input) => {
                stopTyping();
                await mutations.postMessage.mutateAsync(input);
              }}
            />
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Details" />
            <TicketDetailsPanel
              ticket={ticket}
              staff={staff}
              busy={busy}
              onAssign={(assigneeId) => mutations.assign.mutate(assigneeId)}
              onPriority={(priority) => mutations.changePriority.mutate(priority)}
            />
          </Card>

          {staff ? (
            <Card>
              <CardHeader title="Activity" description="Every change, recorded permanently." />
              {activity.isPending ? <Spinner label="Loading activity" /> : null}
              {activity.isError ? <ErrorState error={activity.error} onRetry={() => void activity.refetch()} /> : null}
              {activity.data ? <ActivityTimeline entries={activity.data} /> : null}
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

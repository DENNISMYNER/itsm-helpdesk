import { useState } from 'react';
import { AgentTable } from '../components/analytics/AgentTable';
import { BarList, type BarItem } from '../components/analytics/BarList';
import { StatCard } from '../components/analytics/StatCard';
import { VolumeChart } from '../components/analytics/VolumeChart';
import { Card, CardHeader, PageHeader } from '../components/ui/Card';
import { ErrorState, Spinner } from '../components/ui/Feedback';
import { controlClass } from '../components/ui/Field';
import { useAnalytics } from '../hooks/useAdminData';
import { formatHours, formatMinutes, formatPercent } from '../lib/format';
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from '../lib/labels';
import type { TicketStatus } from '../types/api';

const RANGES = [7, 14, 30, 90] as const;

/** Status bars reuse the status colours so a bar and the badge on a ticket look the same. */
const STATUS_COLOR: Record<TicketStatus, string> = {
  OPEN: 'var(--st-open)',
  IN_PROGRESS: 'var(--st-progress)',
  WAITING_ON_CUSTOMER: 'var(--st-waiting)',
  RESOLVED: 'var(--st-resolved)',
  CLOSED: 'var(--st-closed)',
};

const PRIORITY_COLOR = {
  CRITICAL: 'var(--prio-critical)',
  HIGH: 'var(--prio-high)',
  MEDIUM: 'var(--prio-medium)',
  LOW: 'var(--prio-low)',
} as const;

export function DashboardPage() {
  const [days, setDays] = useState<number>(30);
  const query = useAnalytics(days);
  const data = query.data;

  const statusBars: BarItem[] = (data?.byStatus ?? []).map((row) => ({
    key: row.status,
    label: STATUS_LABEL[row.status],
    value: row.count,
    color: STATUS_COLOR[row.status],
  }));
  const priorityBars: BarItem[] = [...(data?.byPriority ?? [])].reverse().map((row) => ({
    key: row.priority,
    label: PRIORITY_LABEL[row.priority],
    value: row.count,
    color: PRIORITY_COLOR[row.priority],
  }));
  const categoryBars: BarItem[] = [...(data?.byCategory ?? [])]
    .sort((a, b) => b.count - a.count)
    .map((row) => ({ key: row.category, label: CATEGORY_LABEL[row.category], value: row.count }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="How the support desk is doing. Numbers update as tickets change."
        actions={
          <select
            aria-label="Time range"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className={`${controlClass} h-10 w-auto min-w-40`}
          >
            {RANGES.map((range) => (
              <option key={range} value={range}>
                Last {range} days
              </option>
            ))}
          </select>
        }
      />

      {query.isPending ? <Spinner label="Loading analytics" /> : null}
      {query.isError ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : null}

      {data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Active tickets" value={data.totals.active} />
            <StatCard label="Unassigned" value={data.totals.unassigned} tone={data.totals.unassigned > 0 ? 'warning' : 'default'} hint="Waiting for an agent" />
            <StatCard label="Overdue" value={data.totals.overdue} tone={data.totals.overdue > 0 ? 'warning' : 'default'} hint="Past the SLA deadline" />
            <StatCard label="Avg. resolution" value={formatHours(data.averages.resolutionHours)} hint={`Resolved in last ${data.range.days}d`} />
            <StatCard label="First response" value={formatMinutes(data.averages.firstResponseMinutes)} hint="Average time to first reply" />
            <StatCard label="Met SLA" value={formatPercent(data.averages.slaCompliance)} hint="Of tickets resolved" />
          </div>

          <Card>
            <CardHeader title="Ticket volume" description={`${data.totals.created} created and ${data.totals.resolved} resolved in the last ${data.range.days} days`} />
            <div className="px-4 py-4 sm:px-5">
              <VolumeChart data={data.volume} />
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title="All tickets by status" />
              <div className="px-4 py-4 sm:px-5">
                <BarList items={statusBars} emptyText="No tickets yet." />
              </div>
            </Card>
            <Card>
              <CardHeader title="Active by priority" />
              <div className="px-4 py-4 sm:px-5">
                <BarList items={priorityBars} emptyText="Nothing active right now." />
              </div>
            </Card>
            <Card>
              <CardHeader title="New by category" description={`Last ${data.range.days} days`} />
              <div className="px-4 py-4 sm:px-5">
                <BarList items={categoryBars} emptyText="No tickets in this period." />
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Agents" description="Current workload and results in the selected period" />
            <AgentTable agents={data.agents} />
          </Card>
        </div>
      ) : null}
    </>
  );
}

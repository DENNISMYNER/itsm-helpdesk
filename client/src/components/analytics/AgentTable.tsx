import { formatHours } from '../../lib/format';
import type { AnalyticsOverview } from '../../types/api';
import { Avatar } from '../ui/Avatar';

export function AgentTable({ agents }: { agents: AnalyticsOverview['agents'] }) {
  if (agents.length === 0) return <p className="px-5 py-8 text-center text-sm text-muted">No active agents yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm">
        <caption className="sr-only">Workload and performance per agent</caption>
        <thead className="bg-subtle/60 text-left text-xs text-muted">
          <tr>
            <th scope="col" className="px-5 py-2 font-semibold">Agent</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Open now</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Resolved</th>
            <th scope="col" className="px-5 py-2 text-right font-semibold">Avg. resolution</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {agents.map((agent) => (
            <tr key={agent.id}>
              <th scope="row" className="px-5 py-2.5 text-left font-medium">
                <span className="flex items-center gap-2.5">
                  <Avatar name={agent.name} className="size-7 text-[11px]" />
                  {agent.name}
                </span>
              </th>
              <td className="tabular px-3 py-2.5 text-right">{agent.open}</td>
              <td className="tabular px-3 py-2.5 text-right">{agent.resolved}</td>
              <td className="tabular px-5 py-2.5 text-right">{formatHours(agent.avgResolutionHours)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

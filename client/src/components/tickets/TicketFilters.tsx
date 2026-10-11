import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { TicketFilters } from '../../api/tickets.api';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { cn } from '../../lib/cn';
import { CATEGORY_LABEL, PRIORITY_LABEL, STATUS_LABEL } from '../../lib/labels';
import { DEFAULT_FILTERS, SORT_OPTIONS, hasActiveFilters } from '../../lib/ticket-filters';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '../../types/api';
import { Button } from '../ui/Button';
import { controlBaseClass, controlClass } from '../ui/Field';

interface Props {
  filters: TicketFilters;
  onChange: (next: TicketFilters) => void;
  /** Staff can filter by assignee and category; customers only see their own tickets. */
  staff: boolean;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'h-8 rounded-full border px-3 text-sm font-medium transition-colors',
        pressed
          ? 'border-brand bg-brand-soft text-brand'
          : 'border-line-strong bg-panel text-muted hover:bg-subtle hover:text-ink',
      )}
    >
      {children}
    </button>
  );
}

export function TicketFilterBar({ filters, onChange, staff }: Props) {
  // The search box keeps its own text so typing stays instant; the debounced value updates the URL.
  const [search, setSearch] = useState(filters.q);
  const debouncedSearch = useDebouncedValue(search, 350);

  useEffect(() => setSearch(filters.q), [filters.q]);
  useEffect(() => {
    if (debouncedSearch !== filters.q) onChange({ ...filters, q: debouncedSearch.trim(), page: 1 });
    // Only react to the debounced text; `filters` and `onChange` change identity on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const update = (patch: Partial<TicketFilters>) => onChange({ ...filters, ...patch, page: 1 });

  return (
    <div className="space-y-3 border-b border-line px-4 py-4 sm:px-5">
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-56 flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={staff ? 'Search by title or ticket number' : 'Search your tickets'}
            aria-label="Search tickets"
            className={cn(controlClass, 'h-10 pl-9')}
          />
        </div>
        {staff ? (
          <select
            aria-label="Assignee"
            value={filters.assignee}
            onChange={(event) => update({ assignee: event.target.value })}
            className={cn(controlBaseClass, 'h-10 w-auto min-w-40')}
          >
            <option value="">Everyone</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        ) : null}
        {staff ? (
          <select
            aria-label="Category"
            value={filters.category[0] ?? ''}
            onChange={(event) =>
              update({ category: event.target.value ? [event.target.value as TicketCategory] : [] })
            }
            className={cn(controlBaseClass, 'h-10 w-auto min-w-40')}
          >
            <option value="">All categories</option>
            {TICKET_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABEL[category]}
              </option>
            ))}
          </select>
        ) : null}
        <select
          aria-label="Sort tickets"
          value={filters.sort}
          onChange={(event) => update({ sort: event.target.value as TicketFilters['sort'] })}
          className={cn(controlBaseClass, 'h-10 w-auto min-w-40')}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
          {TICKET_STATUSES.map((status: TicketStatus) => (
            <Chip key={status} pressed={filters.status.includes(status)} onClick={() => update({ status: toggle(filters.status, status) })}>
              {STATUS_LABEL[status]}
            </Chip>
          ))}
        </div>
        {staff ? (
          <div role="group" aria-label="Filter by priority" className="flex flex-wrap gap-1.5">
            {TICKET_PRIORITIES.map((priority: TicketPriority) => (
              <Chip key={priority} pressed={filters.priority.includes(priority)} onClick={() => update({ priority: toggle(filters.priority, priority) })}>
                {PRIORITY_LABEL[priority]}
              </Chip>
            ))}
          </div>
        ) : null}
        {hasActiveFilters(filters) ? (
          <Button
            variant="ghost"
            size="sm"
            icon={<X aria-hidden className="size-4" />}
            onClick={() => {
              setSearch('');
              onChange({ ...DEFAULT_FILTERS, sort: filters.sort });
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}

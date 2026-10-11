import type { TicketFilters, TicketSort } from '../api/tickets.api';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '../types/api';

export const SORT_OPTIONS: ReadonlyArray<{ value: TicketSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'priority', label: 'Highest priority' },
];

const SORTS: readonly TicketSort[] = ['newest', 'oldest', 'updated', 'priority'];

/** Keeps only the values that really are members of the allowed list. */
function parseList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (!raw) return [];
  return raw.split(',').filter((value): value is T => (allowed as readonly string[]).includes(value));
}

export const DEFAULT_FILTERS: TicketFilters = {
  status: [],
  priority: [],
  category: [],
  assignee: '',
  q: '',
  sort: 'newest',
  page: 1,
};

/** Filters live in the URL, so a filtered queue can be bookmarked, shared and survives a refresh. */
export function filtersFromParams(params: URLSearchParams): TicketFilters {
  const sort = params.get('sort');
  const page = Number(params.get('page'));
  return {
    status: parseList<TicketStatus>(params.get('status'), TICKET_STATUSES),
    priority: parseList<TicketPriority>(params.get('priority'), TICKET_PRIORITIES),
    category: parseList<TicketCategory>(params.get('category'), TICKET_CATEGORIES),
    assignee: params.get('assignee') ?? '',
    q: params.get('q') ?? '',
    sort: SORTS.find((candidate) => candidate === sort) ?? 'newest',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Writes only non-default values, which keeps URLs short and clean. */
export function filtersToParams(filters: TicketFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status.length) params.set('status', filters.status.join(','));
  if (filters.priority.length) params.set('priority', filters.priority.join(','));
  if (filters.category.length) params.set('category', filters.category.join(','));
  if (filters.assignee) params.set('assignee', filters.assignee);
  if (filters.q) params.set('q', filters.q);
  if (filters.sort !== 'newest') params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

export function hasActiveFilters(filters: TicketFilters): boolean {
  return Boolean(
    filters.status.length || filters.priority.length || filters.category.length || filters.assignee || filters.q,
  );
}

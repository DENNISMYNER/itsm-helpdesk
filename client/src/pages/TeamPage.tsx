import { useState } from 'react';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Card, PageHeader } from '../components/ui/Card';
import { EmptyState, ErrorBanner, ErrorState, Spinner } from '../components/ui/Feedback';
import { controlBaseClass, controlClass } from '../components/ui/Field';
import { Pagination } from '../components/ui/Pagination';
import { cn } from '../lib/cn';
import { useCurrentUser } from '../context/AuthContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useUpdateUser, useUsers } from '../hooks/useAdminData';
import { CATEGORY_LABEL, ROLE_LABEL } from '../lib/labels';
import { ROLES, TICKET_CATEGORIES, type Role, type TicketCategory, type UserAdminView } from '../types/api';

function SkillPicker({ user, disabled, onChange }: { user: UserAdminView; disabled: boolean; onChange: (skills: TicketCategory[]) => void }) {
  return (
    <div role="group" aria-label={`Skills of ${user.name}`} className="flex flex-wrap gap-1.5">
      {TICKET_CATEGORIES.map((category) => {
        const on = user.skills.includes(category);
        return (
          <button
            key={category}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange(on ? user.skills.filter((skill) => skill !== category) : [...user.skills, category])}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs font-medium disabled:opacity-60',
              on ? 'border-brand bg-brand-soft text-brand' : 'border-line-strong text-muted hover:bg-subtle',
            )}
          >
            {CATEGORY_LABEL[category]}
          </button>
        );
      })}
    </div>
  );
}

export function TeamPage() {
  const me = useCurrentUser();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim(), 300);

  const users = useUsers({ page, q, role });
  const update = useUpdateUser();
  const data = users.data;

  return (
    <>
      <PageHeader
        title="Team"
        description="Manage who can work the queue. An agent's skills decide which tickets are routed to them automatically."
      />

      <Card>
        <div className="flex flex-wrap gap-3 border-b border-line px-4 py-4 sm:px-5">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            aria-label="Search people"
            placeholder="Search by name or email"
            className={cn(controlClass, 'h-10 min-w-56 flex-1')}
          />
          <select
            aria-label="Filter by role"
            value={role}
            onChange={(event) => {
              setRole(event.target.value as Role | '');
              setPage(1);
            }}
            className={cn(controlBaseClass, 'h-10 w-auto min-w-40')}
          >
            <option value="">All roles</option>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

        {update.error ? (
          <div className="border-b border-line px-4 py-3 sm:px-5">
            <ErrorBanner error={update.error} />
          </div>
        ) : null}

        {users.isPending ? <Spinner label="Loading people" /> : null}
        {users.isError ? <ErrorState error={users.error} onRetry={() => void users.refetch()} /> : null}
        {data && data.items.length === 0 ? <EmptyState title="Nobody matches" description="Try a different name or role." /> : null}

        {data && data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-line">
              {data.items.map((person) => {
                const self = person.id === me.id;
                const staff = person.role !== 'CUSTOMER';
                return (
                  <li key={person.id} className="grid gap-3 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_10rem_auto] lg:items-start">
                    <div className="min-w-0 space-y-2.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={person.name} />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {person.name}
                            {self ? <span className="ml-2 text-xs font-normal text-muted">(you)</span> : null}
                            {!person.isActive ? <span className="ml-2 rounded bg-danger-soft px-1.5 py-0.5 text-xs font-medium text-danger">Deactivated</span> : null}
                          </p>
                          <p className="truncate text-sm text-muted">{person.email}</p>
                        </div>
                      </div>
                      {person.role === 'AGENT' ? (
                        <SkillPicker
                          user={person}
                          disabled={update.isPending}
                          onChange={(skills) => update.mutate({ id: person.id, input: { skills } })}
                        />
                      ) : null}
                    </div>

                    <select
                      aria-label={`Role of ${person.name}`}
                      value={person.role}
                      disabled={self || update.isPending}
                      onChange={(event) => update.mutate({ id: person.id, input: { role: event.target.value as Role } })}
                      className={cn(controlClass, 'h-9')}
                    >
                      {ROLES.map((value) => (
                        <option key={value} value={value}>
                          {ROLE_LABEL[value]}
                        </option>
                      ))}
                    </select>

                    <Button
                      variant={person.isActive ? 'danger' : 'secondary'}
                      size="sm"
                      disabled={self || update.isPending}
                      onClick={() => update.mutate({ id: person.id, input: { isActive: !person.isActive } })}
                      title={self ? 'You cannot deactivate your own account' : undefined}
                    >
                      {person.isActive ? 'Deactivate' : 'Reactivate'}
                    </Button>
                    {!staff ? null : <span className="sr-only">Staff member</span>}
                  </li>
                );
              })}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onChange={setPage} />
          </>
        ) : null}
      </Card>
    </>
  );
}

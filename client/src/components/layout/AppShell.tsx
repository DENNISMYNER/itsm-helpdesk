import {
  ChartColumn,
  History,
  LifeBuoy,
  LogOut,
  Menu,
  Plus,
  Ticket,
  Users,
  WifiOff,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth, useCurrentUser } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { LiveSyncContext } from '../../context/LiveSyncContext';
import { useLiveSync } from '../../hooks/useLiveSync';
import { cn } from '../../lib/cn';
import { ROLE_LABEL, isStaff } from '../../lib/labels';
import { Avatar } from '../ui/Avatar';
import { NotificationBell } from './NotificationBell';
import { useEffect } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

function navigationFor(role: 'CUSTOMER' | 'AGENT' | 'ADMIN'): NavItem[] {
  const items: NavItem[] = [];
  if (isStaff(role)) items.push({ to: '/dashboard', label: 'Dashboard', icon: ChartColumn });
  items.push({ to: '/tickets', label: isStaff(role) ? 'Queue' : 'My tickets', icon: Ticket, end: true });
  if (role === 'ADMIN') {
    items.push({ to: '/team', label: 'Team', icon: Users });
    items.push({ to: '/activity', label: 'Activity log', icon: History });
  }
  return items;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const items = navigationFor(user.role);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-ink">
          <LifeBuoy aria-hidden className="size-5" />
        </span>
        <span className="text-lg font-bold tracking-tight">Helpdesk</span>
      </div>

      <div className="px-3">
        <NavLink
          to="/tickets/new"
          onClick={onNavigate}
          className="flex h-10 items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold text-brand-ink hover:bg-brand-hover"
        >
          <Plus aria-hidden className="size-4" />
          New ticket
        </NavLink>
      </div>

      <nav aria-label="Main" className="mt-4 flex-1 space-y-0.5 px-3">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end ?? false}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium',
                isActive ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-subtle hover:text-ink',
              )
            }
          >
            <Icon aria-hidden className="size-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-muted">{ROLE_LABEL[user.role]}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-md p-2 text-muted hover:bg-subtle hover:text-ink"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut aria-hidden className="size-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Authenticated layout: sidebar on desktop, slide-over drawer on mobile, live-update plumbing. */
export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { connected, socket } = useSocket();
  const flashing = useLiveSync();
  const location = useLocation();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  return (
    <LiveSyncContext.Provider value={flashing}>
      <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
        <aside className="sticky top-0 hidden h-dvh border-r border-line bg-panel lg:block">
          <SidebarContent />
        </aside>

        {drawerOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/40"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-panel shadow-xl">
              <SidebarContent onNavigate={() => setDrawerOpen(false)} />
            </aside>
          </div>
        ) : null}

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-panel/90 px-3 backdrop-blur sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen((open) => !open)}
              className="rounded-md p-2 text-muted hover:bg-subtle hover:text-ink lg:hidden"
              aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={drawerOpen}
            >
              {drawerOpen ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
            </button>
            <div className="flex-1" />
            {socket && !connected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">
                <WifiOff aria-hidden className="size-3.5" />
                Reconnecting
              </span>
            ) : null}
            <NotificationBell />
          </header>

          <main id="main" className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </LiveSyncContext.Provider>
  );
}

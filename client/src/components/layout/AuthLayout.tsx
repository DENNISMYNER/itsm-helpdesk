import { Clock, LifeBuoy, MessagesSquare, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

const POINTS = [
  { icon: MessagesSquare, text: 'Chat with the person fixing it, in the ticket itself' },
  { icon: Clock, text: 'See at a glance how much time is left on every request' },
  { icon: ShieldCheck, text: 'Every change is recorded, so nothing gets lost or rewritten' },
] as const;

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden bg-brand p-12 text-brand-ink lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/15">
            <LifeBuoy aria-hidden className="size-5" />
          </span>
          <span className="text-xl font-bold tracking-tight">Helpdesk</span>
        </div>
        <div>
          <p className="max-w-md text-3xl font-bold leading-tight tracking-tight">
            Technology problems, solved in the open.
          </p>
          <ul className="mt-8 max-w-md space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-[0.95rem] opacity-95">
                <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm opacity-80">IT support for your team</p>
      </aside>

      <main className="flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8 lg:min-h-0">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-brand-ink">
              <LifeBuoy aria-hidden className="size-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">Helpdesk</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  );
}

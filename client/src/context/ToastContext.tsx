import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../lib/cn';

type ToastTone = 'info' | 'success' | 'error';

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  body?: string;
}

interface ToastContextValue {
  notify: (toast: Omit<Toast, 'id' | 'tone'> & { tone?: ToastTone }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX_VISIBLE = 4;
const LIFETIME_MS = 6000;

const ICON: Record<ToastTone, typeof Info> = { info: Info, success: CheckCircle2, error: TriangleAlert };
const ICON_COLOR: Record<ToastTone, string> = {
  info: 'text-brand',
  success: 'text-success',
  error: 'text-danger',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback<ToastContextValue['notify']>(
    ({ tone = 'info', title, body }) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), { id, tone, title, body }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), LIFETIME_MS));
    },
    [dismiss],
  );

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4"
      >
        {toasts.map((toast) => {
          const Icon = ICON[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-line bg-panel p-3 shadow-lg"
            >
              <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', ICON_COLOR[toast.tone])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.body ? <p className="mt-0.5 truncate text-sm text-muted">{toast.body}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded p-1 text-muted hover:bg-subtle hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

import { TriangleAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Last line of defence: a render error shows a recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 text-center">
        <TriangleAlert aria-hidden className="size-10 text-danger" />
        <h1 className="mt-4 text-xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted">
          The page hit an unexpected error. Reloading usually fixes it. If it keeps happening, tell your administrator.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 h-10 rounded-md bg-brand px-4 text-sm font-semibold text-brand-ink hover:bg-brand-hover"
        >
          Reload the page
        </button>
      </div>
    );
  }
}

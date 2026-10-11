import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 text-center">
      <p className="tabular text-5xl font-bold text-faint">404</p>
      <h1 className="mt-4 text-xl font-bold">This page doesn't exist</h1>
      <p className="mt-2 text-muted">The link may be old, or the address may have a typo.</p>
      <Link to="/" className="mt-6 inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-brand-ink hover:bg-brand-hover">
        Go to your tickets
      </Link>
    </div>
  );
}

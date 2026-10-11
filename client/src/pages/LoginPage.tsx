import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { AuthLayout } from '../components/layout/AuthLayout';
import { homeFor } from '../components/layout/RouteGuards';
import { Button } from '../components/ui/Button';
import { ErrorBanner } from '../components/ui/Feedback';
import { TextField } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';

/** Shortcuts for local development only; they are compiled out of production builds. */
const DEMO_ACCOUNTS = [
  { label: 'Customer', email: 'mary.customer@itsm.dev' },
  { label: 'Agent', email: 'grace.agent@itsm.dev' },
  { label: 'Admin', email: 'admin@itsm.dev' },
] as const;
const DEMO_PASSWORD = 'ChangeMe123!';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      void navigate(from ?? homeFor(user.role), { replace: true });
    } catch (caught) {
      setError(caught);
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Sign in" subtitle="Use your helpdesk account to see your tickets.">
      <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
        <ErrorBanner error={error} />
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button type="submit" className="w-full" loading={submitting} disabled={!email || !password}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{' '}
        <Link to="/register" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>

      {import.meta.env.DEV ? (
        <div className="mt-8 border-t border-line pt-5">
          <p className="mb-2 text-sm text-muted">Demo accounts (development only)</p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEmail(account.email);
                  setPassword(DEMO_PASSWORD);
                }}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </AuthLayout>
  );
}

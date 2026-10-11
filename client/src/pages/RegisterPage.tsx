import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { AuthLayout } from '../components/layout/AuthLayout';
import { homeFor } from '../components/layout/RouteGuards';
import { Button } from '../components/ui/Button';
import { ErrorBanner } from '../components/ui/Feedback';
import { TextField } from '../components/ui/Field';
import { useAuth } from '../context/AuthContext';
import { fieldErrors } from '../lib/api-client';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await register({ name, email, password });
      void navigate(homeFor(user.role), { replace: true });
    } catch (caught) {
      setError(caught);
      setSubmitting(false);
    }
  };

  const errors = fieldErrors(error);
  const hasFieldErrors = Object.keys(errors).length > 0;

  return (
    <AuthLayout title="Create your account" subtitle="Get help from the support team and follow every request.">
      <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
        {hasFieldErrors ? null : <ErrorBanner error={error} />}
        <TextField label="Full name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters, with a letter and a number."
          error={errors.password}
        />
        <Button type="submit" className="w-full" loading={submitting} disabled={!name || !email || !password}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already registered?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

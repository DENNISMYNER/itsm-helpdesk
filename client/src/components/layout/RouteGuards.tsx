import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { isStaff } from '../../lib/labels';
import type { Role } from '../../types/api';
import { Spinner } from '../ui/Feedback';

/** Where each role lands after signing in. */
export function homeFor(role: Role): string {
  return isStaff(role) ? '/dashboard' : '/tickets';
}

/** Renders child routes only for signed-in users; everyone else goes to the sign-in page. */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner label="Loading your workspace" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

/** Restricts child routes to certain roles. The API enforces the same rules; this is only UX. */
export function RequireRole({ roles }: { roles: readonly Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}

/** Sign-in and sign-up pages bounce signed-in users to their home screen. */
export function PublicOnly() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Loading" />;
  if (user) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}

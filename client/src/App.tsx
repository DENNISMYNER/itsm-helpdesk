import { Navigate, Route, Routes } from 'react-router';
import { AppShell } from './components/layout/AppShell';
import { PublicOnly, RequireAuth, RequireRole, homeFor } from './components/layout/RouteGuards';
import { useAuth } from './context/AuthContext';
import { ActivityPage } from './pages/ActivityPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { NewTicketPage } from './pages/NewTicketPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { TeamPage } from './pages/TeamPage';
import { TicketDetailPage } from './pages/TicketDetailPage';
import { TicketsPage } from './pages/TicketsPage';

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<HomeRedirect />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/new" element={<NewTicketPage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />

          <Route element={<RequireRole roles={['AGENT', 'ADMIN']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
          <Route element={<RequireRole roles={['ADMIN']} />}>
            <Route path="/team" element={<TeamPage />} />
            <Route path="/activity" element={<ActivityPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

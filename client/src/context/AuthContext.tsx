import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type LoginInput, type RegisterInput } from '../api/auth.api';
import { ApiError } from '../lib/api-client';
import type { AuthUser } from '../types/api';

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the first "who am I?" check finished. */
  loading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the httpOnly cookie on first load.
  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch((error: unknown) => {
        // 401 simply means "not signed in"; anything else is still treated as signed out.
        if (!(error instanceof ApiError && error.status === 401)) console.error(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (input: LoginInput) => {
      const signedIn = await authApi.login(input);
      queryClient.clear(); // never show another account's cached data
      setUser(signedIn);
      return signedIn;
    },
    [queryClient],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const created = await authApi.register(input);
      queryClient.clear();
      setUser(created);
      return created;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}

/** For screens that are only rendered when signed in. */
export function useCurrentUser(): AuthUser {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser requires a signed-in user');
  return user;
}

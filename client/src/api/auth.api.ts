import { api } from '../lib/api-client';
import type { AuthUser } from '../types/api';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  name: string;
}

export const authApi = {
  me: () => api.get<{ user: AuthUser }>('/auth/me').then((r) => r.user),
  login: (input: LoginInput) => api.post<{ user: AuthUser }>('/auth/login', input).then((r) => r.user),
  register: (input: RegisterInput) =>
    api.post<{ user: AuthUser }>('/auth/register', input).then((r) => r.user),
  logout: () => api.post<void>('/auth/logout'),
};

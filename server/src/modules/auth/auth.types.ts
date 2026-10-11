import type { Role } from '../../domain/enums';

/** The authenticated principal attached to every protected request / socket. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

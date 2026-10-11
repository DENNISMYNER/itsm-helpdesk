import { Role } from '../../domain/enums';
import { ConflictError, UnauthorizedError } from '../../lib/errors';
import { hashPassword, verifyPassword } from '../../lib/password';
import { prisma } from '../../lib/prisma';
import type { LoginInput, RegisterInput } from './auth.schemas';
import type { AuthUser } from './auth.types';

const authUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
} as const;

/** Loads the principal for a verified token; null if missing or deactivated. */
export async function findAuthUserById(id: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({ where: { id }, select: authUserSelect });
  if (!user || !user.isActive) return null;
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/** Public sign-up always creates a CUSTOMER; staff accounts are provisioned by admins. */
export async function registerCustomer(input: RegisterInput): Promise<AuthUser> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) throw new ConflictError('An account with this email already exists', 'EMAIL_TAKEN');

  const passwordHash = await hashPassword(input.password);
  const created = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash, role: Role.CUSTOMER },
    select: authUserSelect,
  });
  return { id: created.id, email: created.email, name: created.name, role: created.role };
}

/** Same error for unknown email, wrong password and deactivated account (no user enumeration). */
export async function authenticateUser(input: LoginInput): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...authUserSelect, passwordHash: true },
  });

  const passwordOk = await verifyPassword(input.password, user?.passwordHash ?? null);
  if (!user || !passwordOk || !user.isActive) {
    throw new UnauthorizedError('Invalid email or password');
  }
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

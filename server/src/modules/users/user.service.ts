import { Role } from '../../domain/enums';
import { ConflictError, NotFoundError } from '../../lib/errors';
import { buildPage, type Page } from '../../lib/http';
import { prisma, type Prisma } from '../../lib/prisma';
import type { AuthUser } from '../auth/auth.types';
import type { ListUsersQuery, UpdateUserInput } from './user.schemas';
import {
  staffSelect,
  userAdminSelect,
  type StaffMember,
  type UserAdminView,
} from './user.selects';

/** Active staff that tickets can be assigned to (agent picker). */
export function listAssignableStaff(): Promise<StaffMember[]> {
  return prisma.user.findMany({
    where: { role: { in: [Role.AGENT, Role.ADMIN] }, isActive: true },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    select: staffSelect,
  });
}

export async function listUsers(query: ListUsersQuery): Promise<Page<UserAdminView>> {
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { email: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      orderBy: [{ role: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: userAdminSelect,
    }),
    prisma.user.count({ where }),
  ]);

  return buildPage(items, total, query.page, query.pageSize);
}

export async function updateUser(
  actor: AuthUser,
  userId: string,
  input: UpdateUserInput,
): Promise<UserAdminView> {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) throw new NotFoundError('User not found');

  // Prevents an admin from locking themselves (and possibly everyone) out.
  if (actor.id === userId && (input.role !== undefined || input.isActive === false)) {
    throw new ConflictError('You cannot change your own role or deactivate your own account');
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.skills !== undefined ? { skills: { set: input.skills } } : {}),
    },
    select: userAdminSelect,
  });
}

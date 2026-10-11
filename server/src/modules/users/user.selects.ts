import type { Prisma } from '../../lib/prisma';

/** Minimal public reference to a user (never includes the password hash). */
export const userRefSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} satisfies Prisma.UserSelect;
export type UserRef = Prisma.UserGetPayload<{ select: typeof userRefSelect }>;

/** Staff member as shown in assignee pickers and the team page. */
export const staffSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  skills: true,
  isActive: true,
} satisfies Prisma.UserSelect;
export type StaffMember = Prisma.UserGetPayload<{ select: typeof staffSelect }>;

export const userAdminSelect = {
  ...staffSelect,
  createdAt: true,
} satisfies Prisma.UserSelect;
export type UserAdminView = Prisma.UserGetPayload<{ select: typeof userAdminSelect }>;

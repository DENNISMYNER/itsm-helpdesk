/**
 * Compile-time guard: if schema.prisma and src/domain/enums.ts ever disagree,
 * `tsc` fails here. This file has no runtime behaviour and is never imported.
 */
import type * as Generated from '../generated/prisma/enums';
import type {
  AuditAction,
  NotificationType,
  Role,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from './enums';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

export type EnumParityChecks = [
  Assert<Equal<Role, Generated.Role>>,
  Assert<Equal<TicketStatus, Generated.TicketStatus>>,
  Assert<Equal<TicketPriority, Generated.TicketPriority>>,
  Assert<Equal<TicketCategory, Generated.TicketCategory>>,
  Assert<Equal<AuditAction, Generated.AuditAction>>,
  Assert<Equal<NotificationType, Generated.NotificationType>>,
];

/**
 * Role-Based Access Control.
 *
 * Permissions are coarse-grained (entity + action). Each role maps to a
 * static set of permissions; we deliberately avoid per-user permission
 * grants to keep auditability simple. Need a special case? Add a role.
 */
import { UserRole } from '@prisma/client'

export type Permission =
  | 'forklift:read'
  | 'forklift:write'
  | 'forklift:delete'
  | 'customer:read'
  | 'customer:write'
  | 'customer:delete'
  | 'sale:read'
  | 'sale:write'
  | 'sale:delete'
  | 'user:read'
  | 'user:write'
  | 'audit:read'
  | 'backup:run'

const ROLE_PERMISSIONS: Record<UserRole, ReadonlyArray<Permission>> = {
  ADMIN: [
    'forklift:read', 'forklift:write', 'forklift:delete',
    'customer:read', 'customer:write', 'customer:delete',
    'sale:read', 'sale:write', 'sale:delete',
    'user:read', 'user:write',
    'audit:read',
    'backup:run',
  ],
  MANAGER: [
    'forklift:read', 'forklift:write', 'forklift:delete',
    'customer:read', 'customer:write', 'customer:delete',
    'sale:read', 'sale:write', 'sale:delete',
    'user:read',
    'audit:read',
  ],
  SALES: [
    'forklift:read', 'forklift:write',
    'customer:read', 'customer:write',
    'sale:read', 'sale:write',
  ],
  SERVICE: [
    'forklift:read', 'forklift:write',
    'customer:read',
    'sale:read',
  ],
  READ_ONLY: [
    'forklift:read',
    'customer:read',
    'sale:read',
  ],
}

export function permissionsFor(role: UserRole): ReadonlyArray<Permission> {
  return ROLE_PERMISSIONS[role]
}

export function can(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role].includes(permission)
}

/**
 * Throws a typed error if the role lacks the required permission.
 * Use inside server actions: `requirePermission(session.user.role, 'forklift:write')`
 */
export class ForbiddenError extends Error {
  constructor(message = 'You do not have permission to perform this action') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export function requirePermission(role: UserRole | undefined | null, permission: Permission): void {
  if (!can(role, permission)) throw new ForbiddenError()
}

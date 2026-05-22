import { describe, it, expect } from 'vitest'
import { can, permissionsFor, requirePermission, ForbiddenError } from '@/lib/auth/rbac'
import { UserRole } from '@prisma/client'

describe('RBAC', () => {
  it('ADMIN has every permission', () => {
    const perms = permissionsFor(UserRole.ADMIN)
    expect(perms).toContain('forklift:delete')
    expect(perms).toContain('user:write')
    expect(perms).toContain('backup:run')
  })

  it('READ_ONLY cannot mutate', () => {
    expect(can(UserRole.READ_ONLY, 'forklift:read')).toBe(true)
    expect(can(UserRole.READ_ONLY, 'forklift:write')).toBe(false)
    expect(can(UserRole.READ_ONLY, 'sale:write')).toBe(false)
    expect(can(UserRole.READ_ONLY, 'user:read')).toBe(false)
  })

  it('SALES can write inventory and sales but not delete forklifts', () => {
    expect(can(UserRole.SALES, 'forklift:write')).toBe(true)
    expect(can(UserRole.SALES, 'sale:write')).toBe(true)
    expect(can(UserRole.SALES, 'forklift:delete')).toBe(false)
    expect(can(UserRole.SALES, 'user:write')).toBe(false)
  })

  it('SERVICE can edit inventory but cannot record sales', () => {
    expect(can(UserRole.SERVICE, 'forklift:write')).toBe(true)
    expect(can(UserRole.SERVICE, 'sale:write')).toBe(false)
  })

  it('MANAGER cannot manage users', () => {
    expect(can(UserRole.MANAGER, 'user:read')).toBe(true)
    expect(can(UserRole.MANAGER, 'user:write')).toBe(false)
  })

  it('requirePermission throws ForbiddenError when denied', () => {
    expect(() => requirePermission(UserRole.READ_ONLY, 'forklift:write')).toThrow(ForbiddenError)
    expect(() => requirePermission(UserRole.ADMIN, 'forklift:write')).not.toThrow()
  })

  it('null role is denied everything', () => {
    expect(can(null, 'forklift:read')).toBe(false)
    expect(can(undefined, 'forklift:read')).toBe(false)
  })
})

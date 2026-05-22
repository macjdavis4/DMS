/**
 * Helpers to enforce authentication inside server actions and RSC pages.
 *
 * `requireSession()` is the right default — it throws if no session is
 * present, which trips Next.js error boundaries and avoids the easy mistake
 * of treating an unauthenticated user as a valid one.
 */
import { redirect } from 'next/navigation'
import { auth } from './auth'
import { ForbiddenError, requirePermission, type Permission } from './rbac'

export async function getSession() {
  return auth()
}

/**
 * For RSC pages: redirect unauthenticated users to /login with a return URL.
 */
export async function requireSession(returnTo?: string) {
  const session = await auth()
  if (!session?.user?.id) {
    const qs = returnTo ? `?callbackUrl=${encodeURIComponent(returnTo)}` : ''
    redirect(`/login${qs}`)
  }
  return session
}

/**
 * For server actions: returns the session or throws.
 */
export async function assertSession() {
  const session = await auth()
  if (!session?.user?.id) {
    throw new ForbiddenError('You must be signed in')
  }
  return session
}

export async function assertPermission(permission: Permission) {
  const session = await assertSession()
  requirePermission(session.user.role, permission)
  return session
}

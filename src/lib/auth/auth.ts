/**
 * NextAuth v5 configuration — credentials provider backed by the User table.
 *
 * Session strategy is JWT so we don't need a session table; user state
 * (role, isActive) is refreshed on every request through the `jwt` callback
 * by re-reading the user from the DB if more than 60s have passed.
 */
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import { checkLoginRate, recordLoginFailure, recordLoginSuccess } from '@/lib/rate-limit'
import { recordAudit } from '@/lib/audit'
import { authConfig } from './config'
import type { UserRole } from '@prisma/client'

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: UserRole
      mustChangePwd: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid: string
    role: UserRole
    mustChangePwd: boolean
    refreshedAt: number
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null
        const { email, password } = parsed.data
        const key = email.toLowerCase()

        const rate = checkLoginRate(key)
        if (!rate.allowed) {
          logger.warn({ email: key, retryAfterMs: rate.retryAfterMs }, 'login blocked by rate limiter')
          await recordAudit({ action: 'LOGIN_FAILED', entityType: 'User', changes: { email: key, reason: 'rate_limited' } })
          return null
        }

        const user = await prisma.user.findUnique({ where: { email: key } })
        if (!user || !user.isActive) {
          recordLoginFailure(key)
          await recordAudit({ action: 'LOGIN_FAILED', entityType: 'User', changes: { email: key, reason: 'no_user_or_inactive' } })
          return null
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          await recordAudit({ action: 'LOGIN_FAILED', entityType: 'User', entityId: user.id, changes: { reason: 'account_locked' } })
          return null
        }

        const ok = await compare(password, user.passwordHash)
        if (!ok) {
          recordLoginFailure(key)
          const willLock = user.failedLogins + 1 >= env.LOGIN_MAX_ATTEMPTS
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLogins: { increment: 1 },
              ...(willLock
                ? { lockedUntil: new Date(Date.now() + env.LOGIN_LOCKOUT_MINUTES * 60_000) }
                : {}),
            },
          })
          await recordAudit({ action: 'LOGIN_FAILED', entityType: 'User', entityId: user.id, changes: { reason: 'bad_password' } })
          return null
        }

        recordLoginSuccess(key)
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), failedLogins: 0, lockedUntil: null },
        })
        await recordAudit({ action: 'LOGIN', entityType: 'User', entityId: user.id, userId: user.id })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          mustChangePwd: user.mustChangePwd,
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user) {
        token.uid = user.id as string
        token.role = (user as { role: UserRole }).role
        token.mustChangePwd = (user as { mustChangePwd: boolean }).mustChangePwd
        token.refreshedAt = Date.now()
      } else if (trigger === 'update' || Date.now() - (token.refreshedAt ?? 0) > 60_000) {
        const fresh = await prisma.user.findUnique({ where: { id: token.uid } })
        if (!fresh || !fresh.isActive) return {} as typeof token
        token.role = fresh.role
        token.mustChangePwd = fresh.mustChangePwd
        token.refreshedAt = Date.now()
      }
      return token
    },
    async session({ session, token }) {
      if (token.uid) {
        session.user = {
          id: token.uid,
          email: session.user?.email ?? '',
          name: session.user?.name ?? '',
          role: token.role,
          mustChangePwd: token.mustChangePwd,
        }
      }
      return session
    },
  },
  events: {
    async signOut(message) {
      if ('token' in message && message.token?.uid) {
        await recordAudit({ action: 'LOGOUT', entityType: 'User', entityId: message.token.uid, userId: message.token.uid })
      }
    },
  },
})

/**
 * Edge-safe NextAuth config. Used by middleware (edge runtime).
 * Must not import Node-only modules (bcrypt, prisma, fs, etc).
 *
 * The full config in ./auth.ts extends this with providers.
 */
import type { NextAuthConfig } from 'next-auth'
import { env } from '@/lib/env'

export const authConfig: NextAuthConfig = {
  secret: env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 },
  pages: { signIn: '/login', error: '/login' },
  providers: [], // extended in ./auth.ts
  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user)
    },
  },
}

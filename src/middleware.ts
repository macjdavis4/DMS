/**
 * Global middleware: gate every non-public route behind authentication.
 *
 * Uses an edge-safe auth config (no Node modules). RBAC checks happen
 * inside server actions/components — middleware only answers "logged in?".
 */
import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth/config'

const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/manifest.webmanifest',
]

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (isPublic) return NextResponse.next()

  if (!req.auth?.user) {
    const url = new URL('/login', req.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)'],
}

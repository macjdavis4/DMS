'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Package,
  Users,
  Receipt,
  FileImage,
  ShieldCheck,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GlobalSearch } from '@/components/global-search'
import { signOutAction } from '@/lib/actions/auth'
import type { UserRole } from '@prisma/client'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  /** if defined, the link is hidden unless the user has one of these roles */
  roles?: UserRole[]
}

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/sales', label: 'Sales', icon: Receipt },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/data-cards', label: 'Data Cards', icon: FileImage },
  { href: '/admin/users', label: 'Users', icon: ShieldCheck, roles: ['ADMIN', 'MANAGER'] },
  { href: '/admin/audit', label: 'Audit Log', icon: ShieldCheck, roles: ['ADMIN', 'MANAGER'] },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode
  user: { name: string; email: string; role: UserRole }
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const items = NAV.filter((n) => !n.roles || n.roles.includes(user.role))

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Top bar (mobile + desktop) */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background px-4 lg:px-6">
        <button
          type="button"
          className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Package className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">Forklift DMS</span>
        </Link>
        <div className="mx-2 flex-1 md:mx-4">
          <GlobalSearch />
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right text-xs leading-tight md:block">
            <div className="font-medium">{user.name}</div>
            <div className="text-muted-foreground">{user.role.replace('_', ' ')}</div>
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm" title="Sign out">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </form>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 border-r bg-background lg:block">
          <nav className="flex flex-col gap-1 p-3">
            {items.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </nav>
        </aside>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 top-14 z-30 w-64 transform border-r bg-background transition-transform lg:hidden',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <nav className="flex flex-col gap-1 p-3">
            {items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-accent'
      )}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  )
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

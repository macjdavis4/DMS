import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Users · Admin' }

export default async function UsersPage() {
  const session = await requireSession()
  if (!can(session.user.role, 'user:read')) redirect('/')
  const users = await prisma.user.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] })
  const canManage = can(session.user.role, 'user:write')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Users</h1>
          <p className="text-sm text-muted-foreground">{users.length} accounts</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/admin/users/new">Add User</Link>
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Last Login</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell className="font-mono text-xs">{u.email}</TableCell>
                  <TableCell><Badge variant="secondary">{u.role.replace('_', ' ')}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatDate(u.lastLoginAt)}
                  </TableCell>
                  <TableCell>
                    {u.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Disabled</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

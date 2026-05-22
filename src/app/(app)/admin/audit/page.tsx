import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Audit Log · Admin' }

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>
}) {
  const session = await requireSession()
  if (!can(session.user.role, 'audit:read')) redirect('/')
  const sp = await searchParams

  const logs = await prisma.auditLog.findMany({
    where: sp.entity ? { entityType: sp.entity } : undefined,
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Most recent 200 events.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="hidden md:table-cell">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">
                    {l.createdAt.toISOString().replace('T', ' ').slice(0, 19)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {l.user?.name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badgeVariantFor(l.action)}>{l.action.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {l.entityType}
                    {l.entityId && <span className="text-muted-foreground"> · {l.entityId.slice(0, 8)}</span>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{l.ipAddress ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function badgeVariantFor(action: string): 'success' | 'destructive' | 'secondary' | 'muted' | 'warning' {
  if (action === 'CREATE') return 'success'
  if (action === 'DELETE') return 'destructive'
  if (action === 'LOGIN_FAILED') return 'warning'
  if (action.startsWith('LOGIN') || action === 'LOGOUT') return 'secondary'
  return 'muted'
}

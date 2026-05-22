import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatNumber, formatUSD } from '@/lib/utils'
import type { Condition, InventoryStatus, Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; condition?: string }>
}) {
  const sp = await searchParams
  const q = sp.q?.trim() || ''
  const status = sp.status as InventoryStatus | undefined
  const condition = sp.condition as Condition | undefined

  const where: Prisma.ForkliftWhereInput = {
    deletedAt: null,
    ...(status && { status }),
    ...(condition && { condition }),
    ...(q && {
      OR: [
        { stockNumber: { contains: q, mode: 'insensitive' } },
        { make: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { serialNumber: { contains: q, mode: 'insensitive' } },
      ],
    }),
  }

  const [units, total] = await Promise.all([
    prisma.forklift.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    }),
    prisma.forklift.count({ where }),
  ])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Inventory</h1>
          <p className="text-sm text-muted-foreground">{formatNumber(total)} units match your filters.</p>
        </div>
        <Button asChild>
          <Link href="/inventory/new">Add Forklift</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-3 md:p-4">
          <form className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <Input name="q" placeholder="Search stock #, make, model, serial…" defaultValue={q} className="md:col-span-2" />
            <select
              name="status"
              defaultValue={status ?? ''}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              {['AVAILABLE', 'ON_HOLD', 'IN_SERVICE', 'SOLD', 'ARCHIVED'].map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
            <select
              name="condition"
              defaultValue={condition ?? ''}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All conditions</option>
              <option value="NEW">New</option>
              <option value="USED">Used</option>
            </select>
            <div className="md:col-span-4">
              <Button type="submit" size="sm" variant="secondary">Apply filters</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Stock #</TableHead>
                <TableHead>Make / Model</TableHead>
                <TableHead className="hidden md:table-cell">Year</TableHead>
                <TableHead className="hidden md:table-cell">Fuel</TableHead>
                <TableHead className="hidden lg:table-cell">Capacity</TableHead>
                <TableHead className="hidden lg:table-cell">Hours</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">List</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No forklifts match. <Link href="/inventory/new" className="text-primary underline">Add one</Link>.
                  </TableCell>
                </TableRow>
              ) : (
                units.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/inventory/${u.id}`} className="text-primary hover:underline">
                        {u.stockNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{u.make} {u.model}</div>
                      <div className="text-xs text-muted-foreground md:hidden">
                        {u.year ?? '—'} · {u.condition}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{u.year ?? '—'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {u.fuelType ? u.fuelType.replace('_', ' ') : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {u.capacityLbs ? `${formatNumber(u.capacityLbs)} lbs` : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{formatNumber(u.hours ?? 0)}</TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} condition={u.condition} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatUSD(u.listPrice)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusBadge({ status, condition }: { status: InventoryStatus; condition: Condition }) {
  const variant =
    status === 'AVAILABLE' ? (condition === 'NEW' ? 'success' : 'secondary')
    : status === 'SOLD' ? 'muted'
    : status === 'IN_SERVICE' ? 'warning'
    : 'outline'
  return <Badge variant={variant as 'success' | 'secondary' | 'muted' | 'warning' | 'outline'}>{status.replace('_', ' ')}</Badge>
}

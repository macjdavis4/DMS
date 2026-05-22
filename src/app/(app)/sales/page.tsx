import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatUSD } from '@/lib/utils'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; historical?: string }>
}) {
  const sp = await searchParams
  const q = sp.q?.trim() ?? ''
  const onlyHistorical = sp.historical === '1'

  const where: Prisma.SaleWhereInput = {
    ...(onlyHistorical && { isHistorical: true }),
    ...(q && {
      OR: [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { customer: { company: { contains: q, mode: 'insensitive' } } },
        { customer: { lastName: { contains: q, mode: 'insensitive' } } },
        { forklift: { stockNumber: { contains: q, mode: 'insensitive' } } },
        { forklift: { make: { contains: q, mode: 'insensitive' } } },
        { forklift: { model: { contains: q, mode: 'insensitive' } } },
      ],
    }),
  }

  const sales = await prisma.sale.findMany({
    where,
    include: { customer: true, forklift: true },
    orderBy: { saleDate: 'desc' },
    take: 200,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sales</h1>
          <p className="text-sm text-muted-foreground">{sales.length} sales</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/sales/new">Record Sale</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sales/new?historical=1">Enter Historical Sale</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-3">
          <form className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <Input name="q" placeholder="Search invoice, customer, stock #…" defaultValue={q} className="md:col-span-3" />
            <select
              name="historical"
              defaultValue={onlyHistorical ? '1' : ''}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All sales</option>
              <option value="1">Historical only</option>
            </select>
            <Button type="submit" size="sm" variant="secondary">Apply</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Forklift</TableHead>
                <TableHead className="hidden md:table-cell">Customer</TableHead>
                <TableHead className="hidden lg:table-cell">Invoice</TableHead>
                <TableHead className="hidden lg:table-cell">Type</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No sales yet.
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{formatDate(s.saleDate)}</TableCell>
                    <TableCell>
                      <Link href={`/inventory/${s.forklift.id}`} className="text-primary hover:underline">
                        {s.forklift.make} {s.forklift.model}
                      </Link>
                      <div className="text-xs font-mono text-muted-foreground">{s.forklift.stockNumber}</div>
                      {s.isHistorical && <Badge variant="muted" className="mt-1">Historical</Badge>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Link href={`/customers/${s.customer.id}`} className="hover:underline">
                        {s.customer.company || `${s.customer.firstName} ${s.customer.lastName}`}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell font-mono text-xs">{s.invoiceNumber ?? '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{s.saleType.replace('_', ' ')}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{formatUSD(s.salePrice)}</TableCell>
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

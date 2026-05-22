import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatUSD, formatDate, formatNumber } from '@/lib/utils'
import { Package, Receipt, Users, FileImage, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    totalAvailable,
    newAvailable,
    usedAvailable,
    soldThisMonth,
    customers,
    recentSales,
    lowestStockBy,
  ] = await Promise.all([
    prisma.forklift.count({ where: { status: 'AVAILABLE', deletedAt: null } }),
    prisma.forklift.count({ where: { status: 'AVAILABLE', condition: 'NEW', deletedAt: null } }),
    prisma.forklift.count({ where: { status: 'AVAILABLE', condition: 'USED', deletedAt: null } }),
    prisma.sale.aggregate({
      _count: true,
      _sum: { salePrice: true },
      where: { saleDate: { gte: startOfMonth } },
    }),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.sale.findMany({
      take: 5,
      orderBy: { saleDate: 'desc' },
      include: { customer: true, forklift: true },
    }),
    prisma.forklift.groupBy({
      by: ['make'],
      where: { status: 'AVAILABLE', deletedAt: null },
      _count: true,
      orderBy: { _count: { make: 'desc' } },
      take: 5,
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">A snapshot of inventory and sales activity.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/inventory/new">Add Forklift</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sales/new">Record Sale</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="Available Inventory"
          value={formatNumber(totalAvailable)}
          sub={`${newAvailable} new · ${usedAvailable} used`}
          href="/inventory"
        />
        <StatCard
          icon={Receipt}
          label="Sales This Month"
          value={formatNumber(soldThisMonth._count)}
          sub={formatUSD(soldThisMonth._sum.salePrice)}
          href="/sales"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={formatNumber(customers)}
          href="/customers"
        />
        <StatCard
          icon={FileImage}
          label="Quick Entry"
          value="Data Cards"
          sub="Upload handwritten cards"
          href="/data-cards"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>The last 5 sales recorded in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales recorded yet.</p>
            ) : (
              <ul className="divide-y">
                {recentSales.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <div className="font-medium">
                        {s.forklift.make} {s.forklift.model}{' '}
                        <span className="text-muted-foreground">· {s.forklift.stockNumber}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {s.customer.company || `${s.customer.firstName} ${s.customer.lastName}`} ·{' '}
                        {formatDate(s.saleDate)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={s.isHistorical ? 'muted' : 'success'}>
                        {s.isHistorical ? 'Historical' : 'Current'}
                      </Badge>
                      <div className="font-semibold tabular-nums">{formatUSD(s.salePrice)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Brands in Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {lowestStockBy.length === 0 ? (
              <p className="text-sm text-muted-foreground">No inventory yet.</p>
            ) : (
              <ul className="space-y-2">
                {lowestStockBy.map((row) => (
                  <li key={row.make} className="flex items-center justify-between">
                    <span>{row.make}</span>
                    <Badge variant="secondary">{row._count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  href: string
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardContent className="flex items-start gap-3 p-5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="text-2xl font-bold tabular-nums">{value}</div>
            {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  )
}

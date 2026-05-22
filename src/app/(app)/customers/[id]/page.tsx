import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate, formatUSD } from '@/lib/utils'
import { requireSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'

export const dynamic = 'force-dynamic'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession()
  const c = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        include: { forklift: true },
        orderBy: { saleDate: 'desc' },
      },
    },
  })
  if (!c) notFound()
  const canEdit = can(session.user.role, 'customer:write')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {c.company || `${c.firstName} ${c.lastName}`}
          </h1>
          {c.company && <p className="text-muted-foreground">{c.firstName} {c.lastName}</p>}
        </div>
        {canEdit && (
          <Button asChild variant="outline">
            <Link href={`/customers/${c.id}/edit`}>Edit</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Email" value={c.email} />
            <Row label="Phone" value={c.phone} />
            <Row label="Address" value={[c.address1, c.address2].filter(Boolean).join(', ') || null} />
            <Row label="City/State" value={[c.city, c.state].filter(Boolean).join(', ') || null} />
            <Row label="ZIP" value={c.zip} />
          </CardContent>
        </Card>
        {c.notes && (
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">{c.notes}</CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Sales History ({c.sales.length})</CardTitle></CardHeader>
        <CardContent>
          {c.sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales recorded for this customer.</p>
          ) : (
            <ul className="divide-y">
              {c.sales.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div>
                    <Link href={`/inventory/${s.forklift.id}`} className="font-medium text-primary hover:underline">
                      {s.forklift.make} {s.forklift.model}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {s.forklift.stockNumber} · {formatDate(s.saleDate)}
                    </div>
                  </div>
                  <div className="font-semibold tabular-nums">{formatUSD(s.salePrice)}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span>{value ?? '—'}</span>
    </div>
  )
}

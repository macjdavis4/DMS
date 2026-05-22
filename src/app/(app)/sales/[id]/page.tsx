import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatUSD } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { customer: true, forklift: true, dataCard: true, createdBy: true },
  })
  if (!sale) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sale Details</h1>
        <p className="text-sm text-muted-foreground">
          {formatDate(sale.saleDate)}
          {sale.isHistorical && <Badge variant="muted" className="ml-2">Historical</Badge>}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Forklift</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Link href={`/inventory/${sale.forklift.id}`} className="font-medium text-primary hover:underline">
              {sale.forklift.year ?? ''} {sale.forklift.make} {sale.forklift.model}
            </Link>
            <div className="text-xs font-mono text-muted-foreground">{sale.forklift.stockNumber}</div>
            {sale.forklift.serialNumber && (
              <div className="text-xs text-muted-foreground">SN: {sale.forklift.serialNumber}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Customer</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <Link href={`/customers/${sale.customer.id}`} className="font-medium text-primary hover:underline">
              {sale.customer.company || `${sale.customer.firstName} ${sale.customer.lastName}`}
            </Link>
            {sale.customer.email && <div className="text-muted-foreground">{sale.customer.email}</div>}
            {sale.customer.phone && <div className="text-muted-foreground">{sale.customer.phone}</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Financials</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <Row label="Price" value={formatUSD(sale.salePrice)} />
          <Row label="Type" value={sale.saleType.replace('_', ' ')} />
          <Row label="Invoice" value={sale.invoiceNumber ?? '—'} />
          <Row label="Recorded By" value={sale.createdBy?.name ?? 'system'} />
          <Row label="Created" value={formatDate(sale.createdAt)} />
        </CardContent>
      </Card>

      {sale.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{sale.notes}</CardContent>
        </Card>
      )}

      {sale.dataCard && (
        <Card>
          <CardHeader><CardTitle>Original Data Card</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/attachments/${sale.dataCard.id}`}
              alt="Original handwritten data card"
              className="max-h-96 rounded-md border"
            />
            {sale.dataCard.ocrText && (
              <details>
                <summary className="cursor-pointer text-sm font-medium">OCR Text (confidence {Math.round((sale.dataCard.ocrConfidence ?? 0) * 100)}%)</summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{sale.dataCard.ocrText}</pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-medium tabular-nums">{value}</div>
    </div>
  )
}

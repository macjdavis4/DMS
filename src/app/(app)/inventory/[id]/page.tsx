import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatNumber, formatUSD } from '@/lib/utils'
import { AttachmentUploader } from '@/components/attachment-uploader'
import { DeleteForkliftButton } from '@/components/delete-forklift-button'
import { requireSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'

export const dynamic = 'force-dynamic'

export default async function ForkliftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession()
  const fk = await prisma.forklift.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { createdAt: 'desc' } },
      sale: { include: { customer: true } },
    },
  })
  if (!fk) notFound()

  const canEdit = can(session.user.role, 'forklift:write')
  const canDelete = can(session.user.role, 'forklift:delete')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-muted-foreground">{fk.stockNumber}</div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {fk.year ?? ''} {fk.make} {fk.model}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={fk.condition === 'NEW' ? 'success' : 'secondary'}>{fk.condition}</Badge>
            <Badge variant="outline">{fk.status.replace('_', ' ')}</Badge>
            {fk.serialNumber && <span className="text-xs text-muted-foreground">SN: {fk.serialNumber}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button asChild variant="outline">
              <Link href={`/inventory/${fk.id}/edit`}>Edit</Link>
            </Button>
          )}
          {canEdit && fk.status === 'AVAILABLE' && (
            <Button asChild>
              <Link href={`/sales/new?forkliftId=${fk.id}`}>Record Sale</Link>
            </Button>
          )}
          {canDelete && !fk.sale && <DeleteForkliftButton id={fk.id} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Specifications</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <Spec label="Fuel" value={fk.fuelType?.replace('_', ' ')} />
            <Spec label="Class" value={fk.forkliftClass?.replace('_', ' ')} />
            <Spec label="Capacity" value={fk.capacityLbs ? `${formatNumber(fk.capacityLbs)} lbs` : null} />
            <Spec label="Mast Type" value={fk.mastType} />
            <Spec label="Lowered" value={fk.mastLoweredIn ? `${fk.mastLoweredIn}″` : null} />
            <Spec label="Max Height" value={fk.mastRaisedIn ? `${fk.mastRaisedIn}″` : null} />
            <Spec label="Tires" value={fk.tireType?.replace('_', ' ')} />
            <Spec label="Hours" value={formatNumber(fk.hours ?? 0)} />
            <Spec label="Battery" value={fk.batteryVolts ? `${fk.batteryVolts}V` : null} />
            <Spec label="Side Shift" value={fk.sideShift ? 'Yes' : 'No'} />
            <Spec label="Color" value={fk.color} />
            <Spec label="Yard" value={fk.yardLocation} />
            <Spec label="Attachments" value={fk.attachments} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="List Price" value={formatUSD(fk.listPrice)} />
            <Row label="Acquisition" value={formatUSD(fk.acquisitionCost)} />
            <Row label="Acquired" value={formatDate(fk.acquisitionDate)} />
            <Row label="Created" value={formatDate(fk.createdAt)} />
          </CardContent>
        </Card>
      </div>

      {(fk.description || fk.internalNotes) && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {fk.description && (
            <Card>
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm">{fk.description}</CardContent>
            </Card>
          )}
          {fk.internalNotes && (
            <Card>
              <CardHeader><CardTitle>Internal Notes</CardTitle></CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{fk.internalNotes}</CardContent>
            </Card>
          )}
        </div>
      )}

      {fk.sale && (
        <Card>
          <CardHeader><CardTitle>Sale</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Sold To" value={fk.sale.customer.company || `${fk.sale.customer.firstName} ${fk.sale.customer.lastName}`} />
            <Row label="Date" value={formatDate(fk.sale.saleDate)} />
            <Row label="Price" value={formatUSD(fk.sale.salePrice)} />
            <Row label="Type" value={fk.sale.saleType.replace('_', ' ')} />
            {fk.sale.invoiceNumber && <Row label="Invoice" value={fk.sale.invoiceNumber} />}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Photos & Attachments</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit && <div className="mb-4"><AttachmentUploader forkliftId={fk.id} /></div>}
          {fk.photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attachments yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {fk.photos.map((a) => (
                <a
                  key={a.id}
                  href={`/api/attachments/${a.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-md border bg-muted"
                >
                  {a.mimeType.startsWith('image/') ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={`/api/attachments/${a.id}`}
                      alt={a.originalName}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center text-xs text-muted-foreground">
                      {a.mimeType}
                    </div>
                  )}
                  <div className="truncate p-1 text-[10px] text-muted-foreground">{a.kind}</div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Spec({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div>{value ?? '—'}</div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value ?? '—'}</span>
    </div>
  )
}

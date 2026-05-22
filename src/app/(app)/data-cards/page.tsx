import Link from 'next/link'
import { prisma } from '@/lib/db'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { isOcrConfigured } from '@/lib/ocr'
import { DataCardUploader } from '@/components/data-card-uploader'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Data Cards · OCR' }

export default async function DataCardsPage() {
  const recent = await prisma.attachment.findMany({
    where: { kind: 'DATA_CARD' },
    include: { saleDataCard: { select: { id: true } } },
    orderBy: { createdAt: 'desc' },
    take: 25,
  })

  const ocrReady = isOcrConfigured()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Data Cards</h1>
        <p className="text-sm text-muted-foreground">
          Upload photos or scans of historical hand-written data cards. Google Vision will extract the text so you can
          quickly enter the sale.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload a Data Card</CardTitle>
          <CardDescription>
            {ocrReady
              ? 'OCR is configured. Uploaded images will be transcribed automatically.'
              : 'OCR is not configured — uploads will be stored without text extraction. Set GOOGLE_APPLICATION_CREDENTIALS to enable.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataCardUploader />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data cards uploaded yet.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((a) => (
                <li key={a.id} className="overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/attachments/${a.id}`}
                    alt={a.originalName}
                    loading="lazy"
                    className="h-40 w-full object-cover bg-muted"
                  />
                  <div className="space-y-1 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
                      {a.ocrConfidence != null && (
                        <Badge variant={a.ocrConfidence >= 0.8 ? 'success' : a.ocrConfidence >= 0.5 ? 'warning' : 'destructive'}>
                          {Math.round(a.ocrConfidence * 100)}% OCR
                        </Badge>
                      )}
                    </div>
                    {a.ocrText && (
                      <p className="line-clamp-3 text-xs text-muted-foreground">{a.ocrText}</p>
                    )}
                    <div className="flex gap-2 pt-1">
                      {a.saleDataCard ? (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/sales/${a.saleDataCard.id}`}>View Sale</Link>
                        </Button>
                      ) : (
                        <Button asChild size="sm">
                          <Link href={`/sales/new?historical=1&dataCardId=${a.id}`}>Enter Sale</Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

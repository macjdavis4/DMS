'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AttachmentUploader } from '@/components/attachment-uploader'
import { Card, CardContent } from '@/components/ui/card'

export function DataCardUploader() {
  const router = useRouter()
  const [latest, setLatest] = useState<{ attachmentId: string; ocrText?: string; ocrConfidence?: number } | null>(null)

  return (
    <div className="space-y-4">
      <AttachmentUploader
        defaultKind="DATA_CARD"
        onUploaded={(r) => {
          setLatest(r)
          router.refresh()
        }}
      />
      {latest && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-semibold">Last upload</p>
            {latest.ocrConfidence != null ? (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  OCR confidence: {Math.round(latest.ocrConfidence * 100)}%
                </p>
                {latest.ocrText && (
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{latest.ocrText}</pre>
                )}
              </>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">Uploaded. OCR is not configured.</p>
            )}
            <a
              href={`/sales/new?historical=1&dataCardId=${latest.attachmentId}`}
              className="mt-3 inline-block text-sm text-primary underline"
            >
              Enter sale from this card →
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

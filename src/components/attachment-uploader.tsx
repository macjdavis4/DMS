'use client'

import { useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Camera, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadAttachment } from '@/lib/actions/attachment'
import type { AttachmentKind } from '@prisma/client'
import { useRouter } from 'next/navigation'

interface Props {
  forkliftId?: string
  defaultKind?: AttachmentKind
  /** when true, on success calls onUploaded with the result (used by data-card flow) */
  onUploaded?: (result: { attachmentId: string; ocrText?: string; ocrConfidence?: number }) => void
}

export function AttachmentUploader({ forkliftId, defaultKind = 'PHOTO', onUploaded }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [kind, setKind] = useState<AttachmentKind>(defaultKind)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    startTransition(async () => {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('kind', kind)
        if (forkliftId) fd.append('forkliftId', forkliftId)
        const res = await uploadAttachment(fd)
        if (!res.ok) {
          toast.error(`${file.name}: ${res.message ?? 'upload failed'}`)
          continue
        }
        toast.success(`Uploaded ${file.name}`)
        if (onUploaded && res.attachmentId) {
          onUploaded({
            attachmentId: res.attachmentId,
            ocrText: res.ocrText,
            ocrConfidence: res.ocrConfidence,
          })
        }
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={kind}
        onChange={(e) => setKind(e.target.value as AttachmentKind)}
        className="h-10 rounded-md border border-input bg-background px-2 text-sm"
        aria-label="Attachment kind"
      >
        <option value="PHOTO">Photo</option>
        <option value="DATA_CARD">Data Card (OCR)</option>
        <option value="INVOICE">Invoice</option>
        <option value="DOCUMENT">Document</option>
        <option value="OTHER">Other</option>
      </select>

      <Button type="button" variant="outline" disabled={pending} onClick={() => fileRef.current?.click()}>
        <Upload className="h-4 w-4" />
        Upload
      </Button>
      {/* On mobile, this opens the camera directly */}
      <Button type="button" variant="outline" disabled={pending} onClick={() => cameraRef.current?.click()}>
        <Camera className="h-4 w-4" />
        Camera
      </Button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {pending && <span className="text-xs text-muted-foreground">Uploading…</span>}
    </div>
  )
}

'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { recordAudit } from '@/lib/audit'
import { assertSession, assertPermission } from '@/lib/auth/session'
import { saveBuffer } from '@/lib/storage'
import { extractText, isOcrConfigured } from '@/lib/ocr'
import { env } from '@/lib/env'
import { logger } from '@/lib/logger'
import type { AttachmentKind } from '@prisma/client'

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif'])
const ALLOWED_DOC_MIME = new Set(['application/pdf'])

export interface UploadResult {
  ok: boolean
  message?: string
  attachmentId?: string
  ocrText?: string
  ocrConfidence?: number
}

export async function uploadAttachment(formData: FormData): Promise<UploadResult> {
  const session = await assertPermission('forklift:write')
  const file = formData.get('file')
  const forkliftId = (formData.get('forkliftId') as string | null) || null
  const kindRaw = (formData.get('kind') as string | null) ?? 'PHOTO'
  const kind = (['PHOTO', 'DATA_CARD', 'INVOICE', 'DOCUMENT', 'OTHER'].includes(kindRaw)
    ? kindRaw
    : 'PHOTO') as AttachmentKind

  if (!(file instanceof File)) {
    return { ok: false, message: 'No file provided' }
  }
  if (file.size === 0) return { ok: false, message: 'File is empty' }
  if (file.size > env.MAX_UPLOAD_BYTES) {
    return { ok: false, message: `File exceeds ${Math.floor(env.MAX_UPLOAD_BYTES / 1024 / 1024)} MB` }
  }
  if (!ALLOWED_IMAGE_MIME.has(file.type) && !ALLOWED_DOC_MIME.has(file.type)) {
    return { ok: false, message: `Unsupported file type: ${file.type || 'unknown'}` }
  }

  const buf = Buffer.from(await file.arrayBuffer())

  // Validate file bytes vs claimed MIME type to defend against spoofed content.
  // Magic-byte sniffing: JPG=ffd8ff, PNG=89504e47, PDF=25504446, GIF=474946
  // WEBP=52494646...57454250, HEIC contains 'ftypheic'/'ftypheix' near offset 4
  const head = buf.subarray(0, 16)
  const magicOk = (() => {
    if (file.type === 'image/jpeg') return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
    if (file.type === 'image/png') return head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47
    if (file.type === 'application/pdf') return head.toString('ascii', 0, 4) === '%PDF'
    if (file.type === 'image/gif') return head.toString('ascii', 0, 3) === 'GIF'
    if (file.type === 'image/webp') return head.toString('ascii', 0, 4) === 'RIFF' && head.toString('ascii', 8, 12) === 'WEBP'
    if (file.type === 'image/heic') return head.toString('ascii', 4, 8) === 'ftyp'
    return false
  })()
  if (!magicOk) {
    return { ok: false, message: 'File contents do not match declared type' }
  }

  let stored
  try {
    stored = await saveBuffer(buf, { mimeType: file.type, originalName: file.name })
  } catch (err) {
    logger.error({ err }, 'storage write failed')
    return { ok: false, message: 'Failed to store file' }
  }

  const attachment = await prisma.attachment.create({
    data: {
      kind,
      storagePath: stored.storagePath,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: stored.sizeBytes,
      sha256: stored.sha256,
      forkliftId: forkliftId,
      uploadedById: session.user.id,
    },
  })

  await recordAudit({
    action: 'UPLOAD',
    entityType: 'Attachment',
    entityId: attachment.id,
    userId: session.user.id,
    changes: { kind, originalName: file.name, sizeBytes: stored.sizeBytes, forkliftId },
  })

  // OCR for data cards. We do it inline so historical-sale entry can review
  // the extracted text immediately; for large batches a queue would be wiser.
  let ocrText: string | undefined
  let ocrConfidence: number | undefined
  if (kind === 'DATA_CARD' && isOcrConfigured() && ALLOWED_IMAGE_MIME.has(file.type)) {
    const result = await extractText(buf)
    if (result) {
      await prisma.attachment.update({
        where: { id: attachment.id },
        data: {
          ocrText: result.text,
          ocrConfidence: result.confidence,
          ocrProcessedAt: new Date(),
        },
      })
      await recordAudit({
        action: 'OCR',
        entityType: 'Attachment',
        entityId: attachment.id,
        userId: session.user.id,
        changes: { confidence: result.confidence, length: result.text.length },
      })
      ocrText = result.text
      ocrConfidence = result.confidence
    }
  }

  if (forkliftId) revalidatePath(`/inventory/${forkliftId}`)
  revalidatePath('/data-cards')
  return { ok: true, attachmentId: attachment.id, ocrText, ocrConfidence }
}

export async function deleteAttachment(id: string): Promise<void> {
  const session = await assertPermission('forklift:delete')
  const att = await prisma.attachment.findUnique({ where: { id } })
  if (!att) return
  await prisma.attachment.delete({ where: { id } })
  await recordAudit({
    action: 'DELETE',
    entityType: 'Attachment',
    entityId: id,
    userId: session.user.id,
    changes: { storagePath: att.storagePath, originalName: att.originalName },
  })
  if (att.forkliftId) revalidatePath(`/inventory/${att.forkliftId}`)
  // Note: we leave the file on disk so a second attachment row pointing at the
  // same sha256 (dedup) isn't accidentally broken. A periodic GC sweep is the
  // right place to delete orphans.
}

// Just to silence eslint for unused import in some setups
export async function _ping(): Promise<void> {
  await assertSession()
}

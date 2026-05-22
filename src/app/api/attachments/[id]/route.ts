/**
 * Stream an attachment to the browser.
 *
 * Auth: any signed-in user can fetch; we don't currently scope attachments
 * per-customer, so a session check is sufficient. If we add private
 * attachments later, gate on `kind` + role here.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { readFile } from '@/lib/storage'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const { id } = await params
  const att = await prisma.attachment.findUnique({ where: { id } })
  if (!att) return new NextResponse('Not found', { status: 404 })

  let buf: Buffer
  try {
    buf = await readFile(att.storagePath)
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }

  return new NextResponse(buf, {
    status: 200,
    headers: {
      'Content-Type': att.mimeType,
      'Content-Length': String(buf.byteLength),
      'Content-Disposition': `inline; filename="${encodeURIComponent(att.originalName)}"`,
      'Cache-Control': 'private, max-age=300',
    },
  })
}

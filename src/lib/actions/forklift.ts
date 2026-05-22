'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { recordAudit, diff } from '@/lib/audit'
import { assertPermission } from '@/lib/auth/session'
import { forkliftSchema } from '@/lib/validation'
import type { Prisma } from '@prisma/client'

export interface ActionResult {
  ok: boolean
  errors?: Record<string, string[]>
  message?: string
  id?: string
}

function formToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of formData.entries()) {
    if (k.startsWith('$')) continue
    if (v === '') continue
    out[k] = v
  }
  // checkboxes: missing means false
  out.sideShift = formData.get('sideShift') === 'on' || formData.get('sideShift') === 'true'
  return out
}

export async function createForklift(_: unknown, formData: FormData): Promise<ActionResult> {
  const session = await assertPermission('forklift:write')
  const raw = formToObject(formData)
  const parsed = forkliftSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors }
  }

  try {
    const fk = await prisma.forklift.create({ data: parsed.data as Prisma.ForkliftCreateInput })
    await recordAudit({
      action: 'CREATE',
      entityType: 'Forklift',
      entityId: fk.id,
      userId: session.user.id,
      changes: { after: parsed.data },
    })
    revalidatePath('/inventory')
    revalidatePath('/')
    return { ok: true, id: fk.id }
  } catch (err) {
    const msg = err instanceof Error && err.message.includes('Unique constraint')
      ? 'A forklift with that stock number or serial number already exists'
      : 'Failed to create forklift'
    return { ok: false, message: msg }
  }
}

export async function updateForklift(id: string, _: unknown, formData: FormData): Promise<ActionResult> {
  const session = await assertPermission('forklift:write')
  const raw = formToObject(formData)
  const parsed = forkliftSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors }

  const before = await prisma.forklift.findUnique({ where: { id } })
  if (!before) return { ok: false, message: 'Not found' }

  try {
    const after = await prisma.forklift.update({
      where: { id },
      data: parsed.data as Prisma.ForkliftUpdateInput,
    })
    await recordAudit({
      action: 'UPDATE',
      entityType: 'Forklift',
      entityId: id,
      userId: session.user.id,
      changes: diff(before as Record<string, unknown>, after as Record<string, unknown>),
    })
    revalidatePath('/inventory')
    revalidatePath(`/inventory/${id}`)
    return { ok: true, id }
  } catch {
    return { ok: false, message: 'Failed to update forklift' }
  }
}

export async function softDeleteForklift(id: string): Promise<void> {
  const session = await assertPermission('forklift:delete')
  await prisma.forklift.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'ARCHIVED' },
  })
  await recordAudit({
    action: 'DELETE',
    entityType: 'Forklift',
    entityId: id,
    userId: session.user.id,
  })
  revalidatePath('/inventory')
  redirect('/inventory')
}

export async function restoreForklift(id: string): Promise<void> {
  const session = await assertPermission('forklift:write')
  await prisma.forklift.update({
    where: { id },
    data: { deletedAt: null, status: 'AVAILABLE' },
  })
  await recordAudit({
    action: 'RESTORE',
    entityType: 'Forklift',
    entityId: id,
    userId: session.user.id,
  })
  revalidatePath('/inventory')
}

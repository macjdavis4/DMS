'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { recordAudit } from '@/lib/audit'
import { assertPermission } from '@/lib/auth/session'
import { saleSchema } from '@/lib/validation'
import type { ActionResult } from './forklift'

function toObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('$')) continue
    if (v === '') continue
    out[k] = v
  }
  out.isHistorical = fd.get('isHistorical') === 'on' || fd.get('isHistorical') === 'true'
  return out
}

export async function createSale(_: unknown, formData: FormData): Promise<ActionResult> {
  const session = await assertPermission('sale:write')
  const parsed = saleSchema.safeParse(toObject(formData))
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors }

  const { forkliftId, dataCardId, ...rest } = parsed.data

  try {
    // Atomic: create sale + flip forklift status in one transaction
    const sale = await prisma.$transaction(async (tx) => {
      const fk = await tx.forklift.findUnique({ where: { id: forkliftId } })
      if (!fk) throw new Error('Forklift not found')
      if (fk.status === 'SOLD') throw new Error('Forklift is already sold')

      const created = await tx.sale.create({
        data: {
          ...rest,
          forkliftId,
          dataCardId: dataCardId ?? null,
          createdById: session.user.id,
        },
      })
      await tx.forklift.update({ where: { id: forkliftId }, data: { status: 'SOLD' } })
      return created
    })

    await recordAudit({
      action: 'CREATE',
      entityType: 'Sale',
      entityId: sale.id,
      userId: session.user.id,
      changes: { after: parsed.data },
    })
    revalidatePath('/sales')
    revalidatePath('/inventory')
    return { ok: true, id: sale.id }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Failed to record sale' }
  }
}

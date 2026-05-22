'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { recordAudit, diff } from '@/lib/audit'
import { assertPermission } from '@/lib/auth/session'
import { customerSchema } from '@/lib/validation'
import type { ActionResult } from './forklift'

function toObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('$')) continue
    if (v === '') continue
    out[k] = v
  }
  return out
}

export async function createCustomer(_: unknown, formData: FormData): Promise<ActionResult> {
  const session = await assertPermission('customer:write')
  const parsed = customerSchema.safeParse(toObject(formData))
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors }

  const c = await prisma.customer.create({ data: parsed.data })
  await recordAudit({
    action: 'CREATE',
    entityType: 'Customer',
    entityId: c.id,
    userId: session.user.id,
    changes: { after: parsed.data },
  })
  revalidatePath('/customers')
  return { ok: true, id: c.id }
}

export async function updateCustomer(id: string, _: unknown, formData: FormData): Promise<ActionResult> {
  const session = await assertPermission('customer:write')
  const parsed = customerSchema.safeParse(toObject(formData))
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors }
  const before = await prisma.customer.findUnique({ where: { id } })
  if (!before) return { ok: false, message: 'Not found' }
  const after = await prisma.customer.update({ where: { id }, data: parsed.data })
  await recordAudit({
    action: 'UPDATE',
    entityType: 'Customer',
    entityId: id,
    userId: session.user.id,
    changes: diff(before as Record<string, unknown>, after as Record<string, unknown>),
  })
  revalidatePath('/customers')
  revalidatePath(`/customers/${id}`)
  return { ok: true, id }
}

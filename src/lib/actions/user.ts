'use server'

import { revalidatePath } from 'next/cache'
import { hash, compare } from 'bcryptjs'
import { prisma } from '@/lib/db'
import { recordAudit } from '@/lib/audit'
import { assertSession, assertPermission } from '@/lib/auth/session'
import { newUserSchema, userSchema, changePasswordSchema } from '@/lib/validation'
import type { ActionResult } from './forklift'

function toObject(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of fd.entries()) {
    if (k.startsWith('$')) continue
    if (v === '') continue
    out[k] = v
  }
  out.isActive = fd.get('isActive') === 'on' || fd.get('isActive') === 'true'
  return out
}

export async function createUser(_: unknown, fd: FormData): Promise<ActionResult> {
  const session = await assertPermission('user:write')
  const parsed = newUserSchema.safeParse(toObject(fd))
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors }
  const { password, ...rest } = parsed.data
  try {
    const user = await prisma.user.create({
      data: {
        ...rest,
        passwordHash: await hash(password, 12),
        mustChangePwd: true,
      },
    })
    await recordAudit({
      action: 'CREATE',
      entityType: 'User',
      entityId: user.id,
      userId: session.user.id,
      changes: { email: user.email, role: user.role },
    })
    revalidatePath('/admin/users')
    return { ok: true, id: user.id }
  } catch (err) {
    const msg = err instanceof Error && err.message.includes('Unique constraint')
      ? 'A user with that email already exists'
      : 'Failed to create user'
    return { ok: false, message: msg }
  }
}

export async function updateUser(id: string, _: unknown, fd: FormData): Promise<ActionResult> {
  const session = await assertPermission('user:write')
  const parsed = userSchema.safeParse(toObject(fd))
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors }
  await prisma.user.update({ where: { id }, data: parsed.data })
  await recordAudit({
    action: 'UPDATE',
    entityType: 'User',
    entityId: id,
    userId: session.user.id,
    changes: { fields: parsed.data },
  })
  revalidatePath('/admin/users')
  return { ok: true, id }
}

export async function changeMyPassword(_: unknown, fd: FormData): Promise<ActionResult> {
  const session = await assertSession()
  const parsed = changePasswordSchema.safeParse({
    currentPassword: fd.get('currentPassword'),
    newPassword: fd.get('newPassword'),
    confirmPassword: fd.get('confirmPassword'),
  })
  if (!parsed.success) return { ok: false, errors: parsed.error.flatten().fieldErrors }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user) return { ok: false, message: 'User not found' }
  const ok = await compare(parsed.data.currentPassword, user.passwordHash)
  if (!ok) return { ok: false, message: 'Current password is incorrect' }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hash(parsed.data.newPassword, 12),
      mustChangePwd: false,
    },
  })
  await recordAudit({
    action: 'PASSWORD_CHANGE',
    entityType: 'User',
    entityId: user.id,
    userId: user.id,
  })
  return { ok: true }
}

'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createUser } from '@/lib/actions/user'
import { UserRole } from '@prisma/client'
import type { ActionResult } from '@/lib/actions/forklift'

export function NewUserForm() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (prev, fd) => createUser(prev, fd),
    { ok: false }
  )

  useEffect(() => {
    if (state?.ok) {
      toast.success('User created')
      router.push('/admin/users')
      router.refresh()
    } else if (state?.message) {
      toast.error(state.message)
    }
  }, [state, router])

  const err = (k: string) => state?.errors?.[k]?.[0]

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label className="mb-1.5 block">Full Name *</Label>
        <Input name="name" required maxLength={120} />
        {err('name') && <p className="mt-1 text-xs text-destructive">{err('name')}</p>}
      </div>
      <div>
        <Label className="mb-1.5 block">Email *</Label>
        <Input name="email" type="email" required inputMode="email" autoComplete="off" />
        {err('email') && <p className="mt-1 text-xs text-destructive">{err('email')}</p>}
      </div>
      <div>
        <Label className="mb-1.5 block">Role *</Label>
        <select name="role" defaultValue={UserRole.SALES} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          {Object.values(UserRole).map((r) => (
            <option key={r} value={r}>{r.replace('_', ' ')}</option>
          ))}
        </select>
        {err('role') && <p className="mt-1 text-xs text-destructive">{err('role')}</p>}
      </div>
      <div>
        <Label className="mb-1.5 block">Temporary Password *</Label>
        <Input name="password" type="password" required minLength={12} autoComplete="new-password" />
        <p className="mt-1 text-xs text-muted-foreground">Min 12 chars, must include upper, lower, digit.</p>
        {err('password') && <p className="mt-1 text-xs text-destructive">{err('password')}</p>}
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4" />
        <span className="text-sm">Active</span>
      </label>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create user'}</Button>
      </div>
    </form>
  )
}

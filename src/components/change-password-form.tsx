'use client'

import { useActionState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changeMyPassword } from '@/lib/actions/user'
import type { ActionResult } from '@/lib/actions/forklift'

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (prev, fd) => changeMyPassword(prev, fd),
    { ok: false }
  )

  useEffect(() => {
    if (state?.ok) toast.success('Password changed')
    else if (state?.message) toast.error(state.message)
  }, [state])

  const err = (k: string) => state?.errors?.[k]?.[0]

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <Label className="mb-1.5 block">Current Password</Label>
        <Input type="password" name="currentPassword" required autoComplete="current-password" />
      </div>
      <div>
        <Label className="mb-1.5 block">New Password</Label>
        <Input type="password" name="newPassword" required minLength={12} autoComplete="new-password" />
        {err('newPassword') && <p className="mt-1 text-xs text-destructive">{err('newPassword')}</p>}
      </div>
      <div>
        <Label className="mb-1.5 block">Confirm New Password</Label>
        <Input type="password" name="confirmPassword" required minLength={12} autoComplete="new-password" />
        {err('confirmPassword') && <p className="mt-1 text-xs text-destructive">{err('confirmPassword')}</p>}
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Change password'}</Button>
    </form>
  )
}

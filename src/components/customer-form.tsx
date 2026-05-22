'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createCustomer, updateCustomer } from '@/lib/actions/customer'
import type { ActionResult } from '@/lib/actions/forklift'

type Customer = {
  id: string
  company: string | null
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  address1: string | null
  address2: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
}

export function CustomerForm({ customer, cancelHref }: { customer?: Customer; cancelHref: string }) {
  const router = useRouter()
  const isEdit = Boolean(customer)
  const initialState: ActionResult = { ok: false }
  const action = isEdit ? updateCustomer.bind(null, customer!.id) : createCustomer
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (prev, fd) => action(prev, fd),
    initialState
  )

  useEffect(() => {
    if (state?.ok) {
      toast.success(isEdit ? 'Customer updated' : 'Customer created')
      router.push(state.id ? `/customers/${state.id}` : '/customers')
      router.refresh()
    } else if (state?.message) {
      toast.error(state.message)
    }
  }, [state, isEdit, router])

  const err = (k: string) => state?.errors?.[k]?.[0]

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block">Company</Label>
          <Input name="company" defaultValue={customer?.company ?? ''} />
          {err('company') && <p className="mt-1 text-xs text-destructive">{err('company')}</p>}
        </div>
        <div>
          <Label className="mb-1.5 block">First Name *</Label>
          <Input name="firstName" required defaultValue={customer?.firstName ?? ''} autoComplete="given-name" />
          {err('firstName') && <p className="mt-1 text-xs text-destructive">{err('firstName')}</p>}
        </div>
        <div>
          <Label className="mb-1.5 block">Last Name *</Label>
          <Input name="lastName" required defaultValue={customer?.lastName ?? ''} autoComplete="family-name" />
          {err('lastName') && <p className="mt-1 text-xs text-destructive">{err('lastName')}</p>}
        </div>
        <div>
          <Label className="mb-1.5 block">Email</Label>
          <Input type="email" name="email" defaultValue={customer?.email ?? ''} inputMode="email" autoComplete="email" />
          {err('email') && <p className="mt-1 text-xs text-destructive">{err('email')}</p>}
        </div>
        <div>
          <Label className="mb-1.5 block">Phone</Label>
          <Input type="tel" name="phone" defaultValue={customer?.phone ?? ''} inputMode="tel" autoComplete="tel" />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block">Address</Label>
          <Input name="address1" defaultValue={customer?.address1 ?? ''} autoComplete="address-line1" />
          <Input name="address2" defaultValue={customer?.address2 ?? ''} className="mt-2" autoComplete="address-line2" />
        </div>
        <div>
          <Label className="mb-1.5 block">City</Label>
          <Input name="city" defaultValue={customer?.city ?? ''} autoComplete="address-level2" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="mb-1.5 block">State</Label>
            <Input name="state" defaultValue={customer?.state ?? ''} maxLength={20} autoComplete="address-level1" />
          </div>
          <div>
            <Label className="mb-1.5 block">ZIP</Label>
            <Input name="zip" defaultValue={customer?.zip ?? ''} maxLength={10} inputMode="numeric" autoComplete="postal-code" />
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-1.5 block">Notes</Label>
          <Textarea name="notes" rows={3} defaultValue={customer?.notes ?? ''} />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" onClick={() => router.push(cancelHref)}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create customer'}</Button>
      </div>
    </form>
  )
}

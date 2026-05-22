'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createSale } from '@/lib/actions/sale'
import { SaleType } from '@prisma/client'
import type { ActionResult } from '@/lib/actions/forklift'

interface ForkliftOption {
  id: string
  stockNumber: string
  make: string
  model: string
  year: number | null
  status: string
}

interface CustomerOption {
  id: string
  company: string | null
  firstName: string
  lastName: string
}

interface Props {
  forklifts: ForkliftOption[]
  customers: CustomerOption[]
  preselectedForkliftId?: string
  isHistorical?: boolean
  dataCardId?: string
}

export function SaleForm({ forklifts, customers, preselectedForkliftId, isHistorical, dataCardId }: Props) {
  const router = useRouter()
  const [forkliftId, setForkliftId] = useState(preselectedForkliftId ?? '')
  const initialState: ActionResult = { ok: false }

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (prev, fd) => createSale(prev, fd),
    initialState
  )

  useEffect(() => {
    if (state?.ok) {
      toast.success('Sale recorded')
      router.push('/sales')
      router.refresh()
    } else if (state?.message) {
      toast.error(state.message)
    }
  }, [state, router])

  const err = (k: string) => state?.errors?.[k]?.[0]

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label className="mb-1.5 block">Forklift *</Label>
        <select
          name="forkliftId"
          required
          value={forkliftId}
          onChange={(e) => setForkliftId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Select a forklift…</option>
          {forklifts.map((f) => (
            <option key={f.id} value={f.id}>
              {f.stockNumber} — {f.year ?? ''} {f.make} {f.model}
              {f.status !== 'AVAILABLE' ? ` (${f.status.replace('_', ' ')})` : ''}
            </option>
          ))}
        </select>
        {err('forkliftId') && <p className="mt-1 text-xs text-destructive">{err('forkliftId')}</p>}
      </div>

      <div>
        <Label className="mb-1.5 block">Customer *</Label>
        <select
          name="customerId"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Select a customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company || `${c.firstName} ${c.lastName}`}
            </option>
          ))}
        </select>
        {err('customerId') && <p className="mt-1 text-xs text-destructive">{err('customerId')}</p>}
        <p className="mt-1 text-xs text-muted-foreground">
          Customer not in list?{' '}
          <a href="/customers/new" className="text-primary underline">Add a new customer</a>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block">Sale Date *</Label>
          <Input type="date" name="saleDate" required defaultValue={new Date().toISOString().slice(0, 10)} />
          {err('saleDate') && <p className="mt-1 text-xs text-destructive">{err('saleDate')}</p>}
        </div>
        <div>
          <Label className="mb-1.5 block">Sale Price *</Label>
          <Input type="number" step="0.01" min={0} name="salePrice" required inputMode="decimal" />
          {err('salePrice') && <p className="mt-1 text-xs text-destructive">{err('salePrice')}</p>}
        </div>
        <div>
          <Label className="mb-1.5 block">Sale Type</Label>
          <select name="saleType" defaultValue={SaleType.CASH} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {Object.values(SaleType).map((t) => (
              <option key={t} value={t}>{t.replace('_', ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <Label className="mb-1.5 block">Invoice Number</Label>
          <Input name="invoiceNumber" />
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block">Notes</Label>
        <Textarea name="notes" rows={3} />
      </div>

      <label className="flex items-center gap-2">
        <input type="checkbox" name="isHistorical" defaultChecked={isHistorical} className="h-4 w-4" />
        <span className="text-sm">Historical sale (already completed in the past)</span>
      </label>

      {dataCardId && <input type="hidden" name="dataCardId" value={dataCardId} />}

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Record sale'}</Button>
      </div>
    </form>
  )
}

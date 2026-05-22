'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Condition,
  ForkliftClass,
  FuelType,
  InventoryStatus,
  TireType,
} from '@prisma/client'
import { createForklift, updateForklift, type ActionResult } from '@/lib/actions/forklift'

type Forklift = {
  id: string
  stockNumber: string
  status: InventoryStatus
  condition: Condition
  make: string
  model: string
  year: number | null
  serialNumber: string | null
  fuelType: FuelType | null
  forkliftClass: ForkliftClass | null
  capacityLbs: number | null
  mastType: string | null
  mastLoweredIn: number | null
  mastRaisedIn: number | null
  sideShift: boolean
  attachments: string | null
  hours: number | null
  tireType: TireType | null
  batteryVolts: number | null
  color: string | null
  yardLocation: string | null
  acquisitionDate: Date | null
  acquisitionCost: unknown
  listPrice: unknown
  description: string | null
  internalNotes: string | null
}

interface Props {
  forklift?: Forklift
  cancelHref: string
}

const STATUS_OPTIONS = Object.values(InventoryStatus)
const CONDITION_OPTIONS = Object.values(Condition)
const FUEL_OPTIONS = Object.values(FuelType)
const CLASS_OPTIONS = Object.values(ForkliftClass)
const TIRE_OPTIONS = Object.values(TireType)

export function ForkliftForm({ forklift, cancelHref }: Props) {
  const router = useRouter()
  const isEdit = Boolean(forklift)

  const initialState: ActionResult = { ok: false }
  const boundAction = isEdit
    ? updateForklift.bind(null, forklift!.id)
    : createForklift

  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    async (_prev, fd) => boundAction(_prev, fd),
    initialState
  )

  useEffect(() => {
    if (!state) return
    if (state.ok) {
      toast.success(isEdit ? 'Forklift updated' : 'Forklift created')
      router.push(state.id ? `/inventory/${state.id}` : '/inventory')
      router.refresh()
    } else if (state.message) {
      toast.error(state.message)
    }
  }, [state, isEdit, router])

  const err = (field: string): string | undefined => state?.errors?.[field]?.[0]

  return (
    <form action={formAction} className="space-y-6">
      <Section title="Identification">
        <Field label="Stock Number *" error={err('stockNumber')}>
          <Input name="stockNumber" defaultValue={forklift?.stockNumber} required maxLength={40} />
        </Field>
        <Field label="Condition *" error={err('condition')}>
          <Native name="condition" defaultValue={forklift?.condition ?? Condition.NEW} required>
            {CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </Native>
        </Field>
        <Field label="Status" error={err('status')}>
          <Native name="status" defaultValue={forklift?.status ?? InventoryStatus.AVAILABLE}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </Native>
        </Field>
        <Field label="Make *" error={err('make')}>
          <Input name="make" defaultValue={forklift?.make} required maxLength={80} />
        </Field>
        <Field label="Model *" error={err('model')}>
          <Input name="model" defaultValue={forklift?.model} required maxLength={80} />
        </Field>
        <Field label="Year" error={err('year')}>
          <Input name="year" type="number" inputMode="numeric" min={1950} max={2100} defaultValue={forklift?.year ?? ''} />
        </Field>
        <Field label="Serial Number" error={err('serialNumber')}>
          <Input name="serialNumber" defaultValue={forklift?.serialNumber ?? ''} />
        </Field>
      </Section>

      <Section title="Specifications">
        <Field label="Fuel Type" error={err('fuelType')}>
          <Native name="fuelType" defaultValue={forklift?.fuelType ?? ''}>
            <option value="">—</option>
            {FUEL_OPTIONS.map((f) => <option key={f} value={f}>{f.replace('_', ' ')}</option>)}
          </Native>
        </Field>
        <Field label="Class" error={err('forkliftClass')}>
          <Native name="forkliftClass" defaultValue={forklift?.forkliftClass ?? ''}>
            <option value="">—</option>
            {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </Native>
        </Field>
        <Field label="Capacity (lbs)" error={err('capacityLbs')}>
          <Input name="capacityLbs" type="number" inputMode="numeric" min={0} max={200000} defaultValue={forklift?.capacityLbs ?? ''} />
        </Field>
        <Field label="Mast Type" error={err('mastType')}>
          <Input name="mastType" defaultValue={forklift?.mastType ?? ''} />
        </Field>
        <Field label="Mast Lowered (in)" error={err('mastLoweredIn')}>
          <Input name="mastLoweredIn" type="number" inputMode="numeric" defaultValue={forklift?.mastLoweredIn ?? ''} />
        </Field>
        <Field label="Max Lift Height (in)" error={err('mastRaisedIn')}>
          <Input name="mastRaisedIn" type="number" inputMode="numeric" defaultValue={forklift?.mastRaisedIn ?? ''} />
        </Field>
        <Field label="Tire Type" error={err('tireType')}>
          <Native name="tireType" defaultValue={forklift?.tireType ?? ''}>
            <option value="">—</option>
            {TIRE_OPTIONS.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </Native>
        </Field>
        <Field label="Hours" error={err('hours')}>
          <Input name="hours" type="number" inputMode="numeric" min={0} defaultValue={forklift?.hours ?? ''} />
        </Field>
        <Field label="Battery (V)" error={err('batteryVolts')}>
          <Input name="batteryVolts" type="number" inputMode="numeric" min={0} max={1000} defaultValue={forklift?.batteryVolts ?? ''} />
        </Field>
        <Field label="Color" error={err('color')}>
          <Input name="color" defaultValue={forklift?.color ?? ''} />
        </Field>
        <Field label="Yard Location" error={err('yardLocation')}>
          <Input name="yardLocation" defaultValue={forklift?.yardLocation ?? ''} />
        </Field>
        <div className="flex items-end pb-2">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" name="sideShift" defaultChecked={forklift?.sideShift ?? false} className="h-4 w-4 rounded" />
            Side Shift
          </label>
        </div>
        <Field label="Attachments" error={err('attachments')} full>
          <Input name="attachments" placeholder="e.g. fork positioner, paper roll clamp" defaultValue={forklift?.attachments ?? ''} />
        </Field>
      </Section>

      <Section title="Pricing & acquisition">
        <Field label="Acquisition Date" error={err('acquisitionDate')}>
          <Input
            name="acquisitionDate"
            type="date"
            defaultValue={forklift?.acquisitionDate ? toDateInput(forklift.acquisitionDate) : ''}
          />
        </Field>
        <Field label="Acquisition Cost" error={err('acquisitionCost')}>
          <Input name="acquisitionCost" type="number" step="0.01" min={0} inputMode="decimal" defaultValue={String(forklift?.acquisitionCost ?? '')} />
        </Field>
        <Field label="List Price" error={err('listPrice')}>
          <Input name="listPrice" type="number" step="0.01" min={0} inputMode="decimal" defaultValue={String(forklift?.listPrice ?? '')} />
        </Field>
      </Section>

      <Section title="Notes">
        <Field label="Public Description" error={err('description')} full>
          <Textarea name="description" rows={3} defaultValue={forklift?.description ?? ''} />
        </Field>
        <Field label="Internal Notes" error={err('internalNotes')} full>
          <Textarea name="internalNotes" rows={3} defaultValue={forklift?.internalNotes ?? ''} />
        </Field>
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
        <Button type="button" variant="ghost" onClick={() => router.push(cancelHref)}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Create forklift'}
        </Button>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  )
}

function Field({
  label,
  error,
  children,
  full,
}: {
  label: string
  error?: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={full ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <Label className="mb-1.5 block">{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

function Native(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }
) {
  return (
    <select
      {...props}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {props.children}
    </select>
  )
}

function toDateInput(d: Date): string {
  return new Date(d).toISOString().slice(0, 10)
}

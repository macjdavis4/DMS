import { requireSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'
import { redirect } from 'next/navigation'
import { ForkliftForm } from '@/components/forklift-form'

export const metadata = { title: 'Add Forklift · Inventory' }

export default async function NewForkliftPage() {
  const session = await requireSession('/inventory/new')
  if (!can(session.user.role, 'forklift:write')) redirect('/inventory')

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Add Forklift</h1>
        <p className="text-sm text-muted-foreground">Required fields are marked with *.</p>
      </div>
      <ForkliftForm cancelHref="/inventory" />
    </div>
  )
}

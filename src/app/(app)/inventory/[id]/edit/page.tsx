import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'
import { ForkliftForm } from '@/components/forklift-form'

export const metadata = { title: 'Edit Forklift · Inventory' }

export default async function EditForkliftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession()
  if (!can(session.user.role, 'forklift:write')) redirect('/inventory')

  const fk = await prisma.forklift.findUnique({ where: { id } })
  if (!fk) notFound()

  // Convert Decimal fields to strings for serialisation across the RSC boundary.
  const safe = {
    ...fk,
    acquisitionCost: fk.acquisitionCost ? String(fk.acquisitionCost) : null,
    listPrice: fk.listPrice ? String(fk.listPrice) : null,
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Edit Forklift</h1>
        <p className="text-sm text-muted-foreground">
          Stock <span className="font-mono">{fk.stockNumber}</span>
        </p>
      </div>
      <ForkliftForm forklift={safe} cancelHref={`/inventory/${fk.id}`} />
    </div>
  )
}

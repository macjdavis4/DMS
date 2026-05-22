import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'
import { SaleForm } from '@/components/sale-form'

export const metadata = { title: 'Record Sale' }

export default async function NewSalePage({
  searchParams,
}: {
  searchParams: Promise<{ forkliftId?: string; historical?: string }>
}) {
  const sp = await searchParams
  const session = await requireSession()
  if (!can(session.user.role, 'sale:write')) redirect('/sales')

  const isHistorical = sp.historical === '1'
  const [forklifts, customers] = await Promise.all([
    prisma.forklift.findMany({
      where: isHistorical
        ? { deletedAt: null }
        : { status: 'AVAILABLE', deletedAt: null },
      orderBy: [{ status: 'asc' }, { stockNumber: 'asc' }],
      select: { id: true, stockNumber: true, make: true, model: true, year: true, status: true },
    }),
    prisma.customer.findMany({
      where: { deletedAt: null },
      orderBy: [{ company: 'asc' }, { lastName: 'asc' }],
      select: { id: true, company: true, firstName: true, lastName: true },
    }),
  ])

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
        {isHistorical ? 'Enter Historical Sale' : 'Record Sale'}
      </h1>
      {isHistorical && (
        <p className="text-sm text-muted-foreground">
          For sales already completed in the past — typically used after OCR&apos;ing a hand-written data card.
        </p>
      )}
      <SaleForm
        forklifts={forklifts}
        customers={customers}
        preselectedForkliftId={sp.forkliftId}
        isHistorical={isHistorical}
      />
    </div>
  )
}

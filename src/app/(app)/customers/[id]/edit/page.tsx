import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'
import { CustomerForm } from '@/components/customer-form'

export const metadata = { title: 'Edit Customer' }

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await requireSession()
  if (!can(session.user.role, 'customer:write')) redirect('/customers')
  const c = await prisma.customer.findUnique({ where: { id } })
  if (!c) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Edit Customer</h1>
      <CustomerForm customer={c} cancelHref={`/customers/${c.id}`} />
    </div>
  )
}

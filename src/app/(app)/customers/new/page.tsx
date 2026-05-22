import { requireSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'
import { redirect } from 'next/navigation'
import { CustomerForm } from '@/components/customer-form'

export const metadata = { title: 'Add Customer' }

export default async function NewCustomerPage() {
  const session = await requireSession()
  if (!can(session.user.role, 'customer:write')) redirect('/customers')
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Add Customer</h1>
      <CustomerForm cancelHref="/customers" />
    </div>
  )
}

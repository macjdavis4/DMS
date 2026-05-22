import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/rbac'
import { NewUserForm } from '@/components/new-user-form'

export const metadata = { title: 'Add User · Admin' }

export default async function NewUserPage() {
  const session = await requireSession()
  if (!can(session.user.role, 'user:write')) redirect('/admin/users')
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Add User</h1>
      <p className="text-sm text-muted-foreground">
        The user will be required to change their password on first sign in.
      </p>
      <NewUserForm />
    </div>
  )
}

import { requireSession } from '@/lib/auth/session'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChangePasswordForm } from '@/components/change-password-form'

export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const session = await requireSession()

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Account preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Name</span><span>{session.user.name}</span>
          </div>
          <div className="flex justify-between border-b py-2">
            <span className="text-muted-foreground">Email</span><span className="font-mono text-xs">{session.user.email}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Role</span><span>{session.user.role.replace('_', ' ')}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Use a strong, unique password.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}

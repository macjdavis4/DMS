import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { LoginForm } from '@/components/login-form'
import { Package } from 'lucide-react'

export const metadata = { title: 'Sign in · Forklift DMS' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const session = await auth()
  const sp = await searchParams
  if (session?.user?.id) {
    redirect(sp.callbackUrl || '/')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-6 w-6" />
          </span>
          <h1 className="text-xl font-semibold">Forklift DMS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue</p>
        </div>
        <LoginForm callbackUrl={sp.callbackUrl} initialError={sp.error} />
      </div>
    </div>
  )
}

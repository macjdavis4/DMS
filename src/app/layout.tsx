import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Forklift DMS',
  description: 'Dealer management system for forklift inventory, sales, and customers',
  applicationName: 'Forklift DMS',
  manifest: '/manifest.webmanifest',
}

// Mobile-friendly viewport — no zoom restrictions (accessibility), proper safe-area.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f172a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  )
}

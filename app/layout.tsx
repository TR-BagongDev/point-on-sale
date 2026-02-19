import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { AccessibilityProvider } from '@/lib/accessibility-context'
import { PWAProvider } from '@/components/pwa/pwa-provider'

export const metadata: Metadata = {
  title: 'Point on Sale - POS Warung',
  description: 'Aplikasi Point of Sale untuk Warung Nasi Goreng',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>
        <PWAProvider />
        <AccessibilityProvider>
          {children}
        </AccessibilityProvider>
        <Toaster />
      </body>
    </html>
  )
}

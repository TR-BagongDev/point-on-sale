import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

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
        {children}
        <Toaster />
      </body>
    </html>
  )
}

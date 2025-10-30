import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { Toaster } from "@/src/components/ui/sonner"

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Radhe Beautic',
  description: 'Unlock your destiny with ACD Referrals',
  icons: {
    icon: '/images/logo_square.svg',
    shortcut: '/images/logo_square.svg',
    apple: '/images/logo_square.svg',
    other: {
      rel: 'icon',
      url: '/images/logo_square.svg',
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>

      <html lang="en">
        <body className={inter.className}>
          <Toaster />
          {children}
        </body>
      </html>
    </SessionProvider>
  )
}

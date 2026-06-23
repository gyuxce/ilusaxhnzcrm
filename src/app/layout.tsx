import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'ILUSA CRM – Harunokaze x Wiwitan',
  description: 'Sistem CRM modern untuk tim CRO ILUSA. Kelola leads, follow-up, pipeline, dan konversi dalam satu platform.',
  keywords: ['CRM', 'ILUSA', 'Harunokaze', 'Leads Management', 'Follow Up'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className="light">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}

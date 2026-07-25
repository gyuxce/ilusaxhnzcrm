import type { Metadata } from 'next'
import { DM_Sans, Fraunces } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { PRODUCT } from '@/lib/brand'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

export const metadata: Metadata = {
  title: PRODUCT.name,
  description:
    'Sistem kerja CRO Harunokaze. Kelola leads, follow-up, pipeline, dan konversi dengan alur yang jelas untuk tim.',
  keywords: ['CRM', 'Harunokaze', 'Leads Management', 'Follow Up', 'CRO'],
  icons: {
    icon: '/harunokaze-logo.jpg',
    apple: '/harunokaze-logo.jpg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            try {
              var saved = localStorage.getItem('theme');
              // Light-first: only use dark when explicitly chosen.
              if (saved === 'dark') {
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
              } else {
                document.documentElement.classList.add('light');
                document.documentElement.classList.remove('dark');
              }
            } catch (e) {}
          })();
        `,
          }}
        />
      </head>
      <body className={`${dmSans.variable} ${fraunces.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

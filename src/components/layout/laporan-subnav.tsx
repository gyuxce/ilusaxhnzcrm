'use client'

import Link from 'next/link'
import { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/language'
import { LAPORAN_LINKS } from '@/lib/navigation'

function SubnavLink({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        'relative px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-secondary'
      )}
    >
      {label}
      <PendingHint />
    </Link>
  )
}

function PendingHint() {
  const { pending } = useLinkStatus()
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0 rounded-lg ring-2 ring-accent/70 transition-opacity',
        pending ? 'opacity-100 animate-pulse' : 'opacity-0'
      )}
    />
  )
}

export function LaporanSubnav() {
  const pathname = usePathname()
  const { lang } = useLanguage()

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {LAPORAN_LINKS.map((link) => {
        const active =
          link.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(link.href)
        return (
          <SubnavLink
            key={link.href}
            href={link.href}
            active={active}
            label={lang === 'en' ? link.labelEn : link.labelId}
          />
        )
      })}
    </div>
  )
}

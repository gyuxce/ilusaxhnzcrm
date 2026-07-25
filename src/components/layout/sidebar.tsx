'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useLayoutStore } from '@/lib/store'
import { useLanguage } from '@/lib/language'
import { PRODUCT } from '@/lib/brand'
import { PRIMARY_NAV, isNavActive } from '@/lib/navigation'
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  KanbanSquare,
  ClipboardCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

const NAV_ICONS: Record<string, LucideIcon> = {
  '/today': ClipboardCheck,
  '/leads': Users,
  '/pipeline': KanbanSquare,
  '/conversions': Wallet,
  '/dashboard': LayoutDashboard,
}

const COPY = {
  en: {
    settings: 'Settings',
    logout: 'Logout',
    legend: 'Where to work',
    legendBody: 'Input in Today or Lead detail. Pipeline & Reports are for monitoring.',
  },
  id: {
    settings: 'Pengaturan',
    logout: 'Keluar',
    legend: 'Data ini ke mana?',
    legendBody: 'Input di Hari Ini atau Detail Lead. Pipeline & Laporan untuk pantau.',
  },
} as const

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarOpen, closeSidebar } = useLayoutStore()
  const { lang } = useLanguage()
  const copy = COPY[lang]
  const supabase = createClient()

  useEffect(() => {
    closeSidebar()
  }, [pathname, closeSidebar])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    closeSidebar()
  }

  return (
    <>
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: 'rgba(27, 42, 74, 0.35)' }}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-[268px] flex flex-col z-30 transition-transform duration-200 app-shell-surface',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-card border border-border overflow-hidden">
            <Image
              src="/harunokaze-logo.jpg"
              alt={PRODUCT.shortName}
              width={40}
              height={40}
              className="h-full w-full object-contain p-0.5"
              priority
            />
          </div>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-semibold text-foreground leading-tight tracking-tight">
              {PRODUCT.name}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {PRODUCT.partnership}
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Menu utama
          </p>
          {PRIMARY_NAV.map((item) => {
            const Icon = NAV_ICONS[item.href] || Users
            const active = isNavActive(pathname, item.href)
            const label = lang === 'en' ? item.labelEn : item.labelId
            const hint = lang === 'en' ? item.hintEn : item.hintId

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={closeSidebar}
                className={cn(
                  'flex items-start gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors border',
                  active
                    ? 'text-primary bg-secondary border-border'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/70'
                )}
              >
                <Icon
                  size={16}
                  className={cn(
                    'mt-0.5 flex-shrink-0',
                    active ? 'text-accent' : 'text-muted-foreground/80'
                  )}
                />
                <span className="min-w-0">
                  <span className={cn('block text-[13px] font-medium', active && 'text-foreground')}>
                    {label}
                  </span>
                  <span className="block text-[10px] text-muted-foreground leading-snug mt-0.5">
                    {hint}
                  </span>
                </span>
                {active && (
                  <span className="ml-auto mt-1 w-0.5 h-5 rounded-l-full bg-accent flex-shrink-0" />
                )}
              </Link>
            )
          })}

          <div className="mt-5 mx-1 rounded-xl border border-border bg-secondary/50 px-3 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-accent">
              {copy.legend}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
              {copy.legendBody}
            </p>
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-border space-y-0.5">
          <Link
            href="/settings"
            prefetch={true}
            onClick={closeSidebar}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors border',
              pathname.startsWith('/settings')
                ? 'text-primary bg-secondary border-border'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/70'
            )}
          >
            <Settings size={16} className="text-muted-foreground flex-shrink-0" />
            {copy.settings}
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut size={16} className="flex-shrink-0" />
            {copy.logout}
          </button>
        </div>
      </aside>
    </>
  )
}

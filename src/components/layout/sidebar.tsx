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
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  KanbanSquare,
  BarChart3,
  ClipboardList,
  Tags,
  UserRoundCheck,
  ClipboardCheck,
  AlertCircle,
  Clock3,
} from 'lucide-react'

const harianNav = [
  { href: '/work-queue', label: 'Kerjaan Hari Ini', icon: ClipboardCheck },
  { href: '/needs-action', label: 'Needs Action', icon: AlertCircle },
  { href: '/follow-ups', label: 'Jadwal Follow-Up', icon: Clock3 },
  { href: '/expert-queue', label: 'Butuh Dibantu', icon: UserRoundCheck },
]

const dataNav = [
  { href: '/leads', label: 'Data Leads', icon: Users },
  { href: '/pipeline', label: 'Alur Leads', icon: KanbanSquare },
]

const insightNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/reports', label: 'Report Harian', icon: ClipboardList },
  { href: '/analytics', label: 'Performa', icon: BarChart3 },
  { href: '/playbook', label: 'Alasan Gagal', icon: Tags },
]

const SIDEBAR_COPY = {
  en: {
    sectionHarian: 'Daily work',
    sectionData: 'Data',
    sectionInsight: 'Insights',
    settings: 'Settings',
    logout: 'Logout',
    whereHint: 'Work here first',
    labels: {
      Dashboard: 'Dashboard',
      'Kerjaan Hari Ini': 'Today Work',
      'Needs Action': 'Needs Action',
      'Jadwal Follow-Up': 'Follow-Up Schedule',
      'Data Leads': 'Lead Data',
      'Alur Leads': 'Lead Flow',
      'Butuh Dibantu': 'Help Needed',
      'Report Harian': 'Daily Report',
      Performa: 'Performance',
      'Alasan Gagal': 'Lost Reasons',
    } as Record<string, string>,
  },
  id: {
    sectionHarian: 'Kerja harian',
    sectionData: 'Data',
    sectionInsight: 'Pantau',
    settings: 'Pengaturan',
    logout: 'Keluar',
    whereHint: 'Mulai kerja di sini',
    labels: {} as Record<string, string>,
  },
} as const

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarOpen, closeSidebar } = useLayoutStore()
  const { lang } = useLanguage()
  const copy = SIDEBAR_COPY[lang]
  const supabase = createClient()

  useEffect(() => {
    closeSidebar()
  }, [pathname, closeSidebar])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    closeSidebar()
  }

  function NavItem({
    href,
    label,
    icon: Icon,
  }: {
    href: string
    label: string
    icon: React.ComponentType<{ size?: number; className?: string }>
  }) {
    const isActive = pathname === href || pathname.startsWith(href + '/')

    return (
      <Link
        href={href}
        prefetch={true}
        onClick={closeSidebar}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 group relative border',
          isActive
            ? 'text-primary bg-secondary border-border'
            : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/70'
        )}
      >
        <Icon
          size={16}
          className={cn(
            'transition-colors flex-shrink-0',
            isActive ? 'text-accent' : 'text-muted-foreground/80 group-hover:text-foreground'
          )}
        />
        <span className="truncate text-[13px] mr-1">{copy.labels[label] || label}</span>
        <span className="flex-1" />
        {isActive && (
          <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-l-full bg-accent" />
        )}
      </Link>
    )
  }

  return (
    <>
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 z-20 bg-ink/40 backdrop-blur-[2px] lg:hidden"
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

        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.14em] px-3 mb-1.5 flex items-center justify-between gap-2">
              <span>{copy.sectionHarian}</span>
              <span className="normal-case tracking-normal font-medium text-[9px] text-accent">
                {copy.whereHint}
              </span>
            </p>
            {harianNav.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>

          <div className="border-t border-border" />

          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.14em] px-3 mb-1.5">
              {copy.sectionData}
            </p>
            {dataNav.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>

          <div className="border-t border-border" />

          <div className="space-y-0.5">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.14em] px-3 mb-1.5">
              {copy.sectionInsight}
            </p>
            {insightNav.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        </nav>

        <div className="px-3 py-4 border-t border-border space-y-0.5">
          <Link
            href="/settings"
            prefetch={true}
            onClick={closeSidebar}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors duration-150 border',
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors duration-150"
          >
            <LogOut size={16} className="flex-shrink-0" />
            {copy.logout}
          </button>
        </div>
      </aside>
    </>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Zap,
  KanbanSquare,
  BarChart3,
  ClipboardList,
  Tags,
  UserRoundCheck,
  ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useLayoutStore } from '@/lib/store'
import { useEffect } from 'react'

const mainNav: { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/work-queue', label: 'Kerjaan Hari Ini', icon: ClipboardCheck },
  { href: '/leads', label: 'Data Leads', icon: Users },
  { href: '/pipeline', label: 'Alur Leads', icon: KanbanSquare },
]

const toolsNav: { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { href: '/expert-queue', label: 'Butuh Dibantu', icon: UserRoundCheck },
  { href: '/reports', label: 'Report Harian', icon: ClipboardList },
  { href: '/analytics', label: 'Performa', icon: BarChart3 },
  { href: '/playbook', label: 'Alasan Gagal', icon: Tags },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarOpen, closeSidebar } = useLayoutStore()
  const supabase = createClient()

  // Automatically close sidebar on mobile when pathname changes
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
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative border border-transparent',
          isActive
            ? 'text-purple-600 dark:text-purple-400 bg-purple-50/70 dark:bg-purple-950/20 border-purple-100/50 dark:border-purple-900/30'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-white/5'
        )}
      >
        <Icon
          size={16}
          className={cn(
            'transition-colors flex-shrink-0',
            isActive ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400'
          )}
        />
        <span className="truncate text-[13px] mr-1">{label}</span>
        {/* spacer pushes active indicator to right edge */}
        <span className="flex-1" />
        {isActive && (
          <span
            className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-l-full bg-purple-600 dark:bg-purple-400"
          />
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-[260px] flex flex-col z-30 transition-transform duration-200 bg-card border-r border-border',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
          >
            <Zap size={17} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-foreground leading-none tracking-tight">CRM Harunokaze</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">HNZ x Wiwitan — CRO v2.0</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {/* Main Menu */}
          <div className="space-y-0.5">
            <p className="text-[9px] font-extrabold text-muted-foreground/60 uppercase tracking-[0.15em] px-3 mb-2">
              Main Menu
            </p>
            {mainNav.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Tools */}
          <div className="space-y-0.5">
            <p className="text-[9px] font-extrabold text-muted-foreground/60 uppercase tracking-[0.15em] px-3 mb-2">
              Tools CRO
            </p>
            {toolsNav.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-border space-y-0.5">
          <Link
            href="/settings"
            prefetch={true}
            onClick={closeSidebar}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 border border-transparent',
              pathname.startsWith('/settings')
                ? 'text-purple-600 dark:text-purple-400 bg-purple-50/70 dark:bg-purple-950/20 border-purple-100/50 dark:border-purple-900/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/50 dark:hover:bg-white/5'
            )}
          >
            <Settings size={16} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
            Pengaturan
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all duration-150"
          >
            <LogOut size={16} className="flex-shrink-0" />
            Keluar
          </button>
        </div>
      </aside>
    </>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Phone,
  Megaphone,
  TrendingUp,
  BookOpen,
  CheckSquare,
  Settings,
  LogOut,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useLayoutStore } from '@/lib/store'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { href: '/follow-ups', label: 'Follow-Up', icon: Phone },
  { href: '/campaigns', label: 'Campaign', icon: Megaphone },
  { href: '/conversions', label: 'Konversi', icon: CheckSquare },
  { href: '/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/playbook', label: 'Playbook', icon: BookOpen },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { sidebarOpen, closeSidebar } = useLayoutStore()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    closeSidebar()
  }

  return (
    <>
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-[260px] flex flex-col z-30 transition-transform duration-300",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          background: 'hsl(222, 47%, 7%)',
          borderRight: '1px solid hsl(222, 47%, 14%)',
        }}
      >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center glow-purple"
          style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
        >
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">ILUSA CRM</p>
          <p className="text-xs text-white/40 mt-0.5">HNZ x Wiwitan</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeSidebar}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              )}
              style={
                isActive
                  ? {
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(168,85,247,0.1))',
                      border: '1px solid rgba(139,92,246,0.2)',
                    }
                  : {}
              }
            >
              <Icon
                size={17}
                className={cn(
                  'transition-colors',
                  isActive ? 'text-purple-400' : 'text-white/40 group-hover:text-white/60'
                )}
              />
              {item.label}
              {isActive && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: 'hsl(250,84%,65%)' }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/5 space-y-1">
        <Link
          href="/settings"
          onClick={closeSidebar}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 hover:bg-white/5 transition-all"
        >
          <Settings size={17} className="text-white/40" />
          Pengaturan
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut size={17} />
          Keluar
        </button>
      </div>
    </aside>
    </>
  )
}

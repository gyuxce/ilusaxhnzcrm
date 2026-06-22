'use client'

import { Bell, Search, Plus, Menu } from 'lucide-react'
import Link from 'next/link'
import { useLayoutStore } from '@/lib/store'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { toggleSidebar } = useLayoutStore()

  return (
    <header
      className="fixed top-0 left-0 lg:left-[260px] right-0 z-20 flex items-center justify-between px-4 sm:px-6"
      style={{
        height: '64px',
        background: 'hsla(222, 47%, 6%, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid hsl(222, 47%, 14%)',
      }}
    >
      {/* Title & Mobile Toggle */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-all lg:hidden flex-shrink-0"
          title="Buka Menu"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-white truncate">{title}</h1>
          {subtitle && <p className="text-[10px] sm:text-xs text-white/40 mt-0.5 hidden sm:block truncate">{subtitle}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all border border-white/5">
          <Search size={14} />
          <span className="hidden sm:inline">Cari...</span>
          <kbd className="hidden sm:inline text-[10px] px-1 py-0.5 rounded bg-white/5 text-white/30">⌘K</kbd>
        </button>

        {/* Add lead */}
        <Link
          href="/leads/new"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))',
          }}
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Tambah Lead</span>
        </Link>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all border border-white/5 flex-shrink-0">
          <Bell size={16} />
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
            style={{
              background: 'hsl(0,72%,51%)',
              borderColor: 'hsl(222, 47%, 6%)',
            }}
          />
        </button>
      </div>
    </header>
  )
}

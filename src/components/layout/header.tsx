'use client'

import { Bell, Search, Plus } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header
      className="fixed top-0 right-0 z-20 flex items-center justify-between px-6"
      style={{
        left: '260px',
        height: '64px',
        background: 'hsla(222, 47%, 6%, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid hsl(222, 47%, 14%)',
      }}
    >
      {/* Title */}
      <div>
        <h1 className="text-base font-semibold text-white">{title}</h1>
        {subtitle && <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>}
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all"
          style={{
            background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))',
          }}
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Tambah Lead</span>
        </Link>

        {/* Notifications */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all border border-white/5">
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

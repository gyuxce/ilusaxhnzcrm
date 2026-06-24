'use client'

import { Bell, Search, Plus, Menu, X, AlertCircle, Calendar, ChevronRight, Sun, Moon, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useLayoutStore } from '@/lib/store'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  title: string
  subtitle?: string
}

interface NotifItem {
  id: string
  type: 'needs_action' | 'follow_up'
  label: string
  name: string
  href: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { toggleSidebar } = useLayoutStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifs, setNotifs] = useState<NotifItem[]>([])
  const [notifCount, setNotifCount] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchNotifs() {
      const today = new Date().toISOString().split('T')[0]

      // Leads yang butuh aksi (in important stages)
      const { data: naLeads } = await supabase
        .from('leads')
        .select('id, full_name, current_status')
        .in('current_status', [
          'Payment Pemetaan Paid',
          'Pemetaan Done',
          'Result Ready',
          'Expert Consultation Done',
          'Seat Lock Offered',
        ])
        .order('updated_at', { ascending: false })
        .limit(5)

      // FU overdue / hari ini
      const { data: fuLeads } = await supabase
        .from('follow_ups')
        .select('id, leads(id, full_name), scheduled_date')
        .eq('is_done', false)
        .lte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(3)

      let dismissed: string[] = []
      if (typeof window !== 'undefined') {
        try {
          dismissed = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]')
        } catch (e) {}
      }

      const items: NotifItem[] = []

      ;(naLeads || []).forEach((l: any) => {
        const key = `needs_action-${l.id}`
        if (!dismissed.includes(key)) {
          items.push({
            id: l.id,
            type: 'needs_action',
            label: l.current_status,
            name: l.full_name,
            href: `/leads/${l.id}`,
          })
        }
      })

      ;(fuLeads || []).forEach((f: any) => {
        if (f.leads) {
          const key = `follow_up-${f.id}`
          if (!dismissed.includes(key)) {
            items.push({
              id: f.id,
              type: 'follow_up',
              label: `FU ${new Date(f.scheduled_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`,
              name: f.leads.full_name,
              href: `/leads/${f.leads.id}`,
            })
          }
        }
      })

      setNotifs(items)
      setNotifCount(items.length)
    }
    fetchNotifs()
  }, [])

  const dismissNotif = (type: string, id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const key = `${type}-${id}`
    
    let dismissed: string[] = []
    try {
      dismissed = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]')
    } catch (err) {}
    
    const newDismissed = [...dismissed, key]
    localStorage.setItem('dismissed_notifications', JSON.stringify(newDismissed))
    
    setNotifs(prev => prev.filter(n => !(n.type === type && n.id === id)))
    setNotifCount(prev => Math.max(0, prev - 1))
  }

  const clearAllNotifs = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    let dismissed: string[] = []
    try {
      dismissed = JSON.parse(localStorage.getItem('dismissed_notifications') || '[]')
    } catch (err) {}
    
    const keysToDismiss = notifs.map(n => `${n.type}-${n.id}`)
    const newDismissed = Array.from(new Set([...dismissed, ...keysToDismiss]))
    localStorage.setItem('dismissed_notifications', JSON.stringify(newDismissed))
    
    setNotifs([])
    setNotifCount(0)
  }

  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isDark = document.documentElement.classList.contains('dark')
      setTheme(isDark ? 'dark' : 'light')
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(nextTheme)
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // Global Spotlight Search State
  const [searchOpen, setSearchOpen] = useState(false)
  const [globalQuery, setGlobalQuery] = useState('')
  const [globalResults, setGlobalResults] = useState<any[]>([])
  const [globalLoading, setGlobalLoading] = useState(false)
  const searchModalRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const closeSearch = () => {
    setSearchOpen(false)
    setGlobalQuery('')
    setGlobalResults([])
    setGlobalLoading(false)
  }

  const normalizeSearchQuery = (value: string) => {
    return value.trim().replace(/[,%()]/g, ' ')
  }

  const handleGlobalQueryChange = (value: string) => {
    setGlobalQuery(value)

    if (normalizeSearchQuery(value).length < 2) {
      setGlobalResults([])
      setGlobalLoading(false)
      return
    }

    setGlobalLoading(true)
  }

  // Listen to keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        closeSearch()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when modal opens
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [searchOpen])

  // Close search modal on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (searchModalRef.current && !searchModalRef.current.contains(e.target as Node)) {
        closeSearch()
      }
    }
    if (searchOpen) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [searchOpen])

  // Fetch search results with 300ms debounce
  useEffect(() => {
    const searchTerm = normalizeSearchQuery(globalQuery)

    if (searchTerm.length < 2) {
      return
    }

    const delayDebounce = setTimeout(async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, full_name, whatsapp_number, source_campaign, current_status')
        .or(`full_name.ilike.%${searchTerm}%,whatsapp_number.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10)

      if (!error && data) {
        setGlobalResults(data)
      }
      setGlobalLoading(false)
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [globalQuery])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  return (
    <header
      className="fixed top-0 left-0 lg:left-[260px] right-0 z-20 flex items-center justify-between px-4 sm:px-6 h-16 bg-background/80 dark:bg-slate-950/85 backdrop-blur-md border-b border-border transition-colors duration-200"
    >
      {/* Title & Mobile Toggle */}
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/5 transition-all lg:hidden flex-shrink-0"
          title="Buka Menu"
        >
          <Menu size={18} />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">{title}</h1>
          {subtitle && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block truncate">{subtitle}</p>}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-slate-100/80 dark:hover:bg-white/5 transition-all border border-border bg-card/50 cursor-pointer"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Cari...</span>
          <kbd className="hidden sm:inline text-[10px] px-1 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-muted-foreground/60 border border-border/40">⌘K</kbd>
        </button>

        {/* Add lead */}
        <Link
          href="/leads/new"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-foreground bg-primary hover:opacity-90 transition-all flex-shrink-0 shadow-sm"
        >
          <Plus size={14} />
          <span className="hidden sm:inline">Tambah Lead</span>
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100/80 dark:hover:bg-white/5 transition-all border border-border bg-card/50 cursor-pointer"
          title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative flex-shrink-0">
          <button
            onClick={() => setNotifOpen(prev => !prev)}
            className="relative w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100/80 dark:hover:bg-white/5 transition-all border border-border bg-card/50"
          >
            <Bell size={16} />
            {notifCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-extrabold px-1"
                style={{ background: 'hsl(0,72%,51%)', color: 'white' }}
              >
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div
              className="absolute right-0 top-12 w-80 rounded-2xl border shadow-2xl overflow-hidden z-50 border-border"
              style={{ backgroundColor: 'hsl(var(--card))' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <p className="text-sm font-extrabold text-foreground">Notifikasi</p>
                  <p className="text-[10px] text-muted-foreground">{notifCount} item perlu perhatian</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {notifCount > 0 && (
                    <button
                      onClick={clearAllNotifs}
                      className="text-[10px] font-bold text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2 py-1 rounded-lg transition-colors cursor-pointer border border-transparent"
                    >
                      Bersihkan Semua
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Bell size={24} className="text-muted-foreground/30" />
                    <p className="text-muted-foreground text-xs">Tidak ada notifikasi saat ini</p>
                  </div>
                ) : (
                  notifs.map(notif => (
                    <div 
                      key={notif.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-all border-b border-border/60 group relative"
                    >
                      <Link
                        href={notif.href}
                        onClick={() => setNotifOpen(false)}
                        className="flex-1 flex items-center gap-3 min-w-0"
                      >
                        {/* Icon */}
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: notif.type === 'follow_up'
                              ? 'rgba(249,115,22,0.12)'
                              : 'rgba(139,92,246,0.12)',
                          }}
                        >
                          {notif.type === 'follow_up'
                            ? <Calendar size={14} className="text-orange-500 dark:text-orange-400" />
                            : <AlertCircle size={14} className="text-purple-600 dark:text-purple-400" />
                          }
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {notif.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{notif.label}</p>
                        </div>
                      </Link>

                      {/* Dismiss Action Button */}
                      <button
                        onClick={(e) => dismissNotif(notif.type, notif.id, e)}
                        className="p-1 rounded-lg text-muted-foreground/45 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-all flex-shrink-0 cursor-pointer"
                        title="Tandai Dibaca / Sembunyikan"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border grid grid-cols-2 gap-2">
                <Link
                  href="/needs-action"
                  onClick={() => setNotifOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold text-purple-600 dark:text-purple-400 transition-all bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30"
                >
                  <AlertCircle size={11} /> Needs Action
                </Link>
                <Link
                  href="/follow-ups"
                  onClick={() => setNotifOpen(false)}
                  className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold text-orange-600 dark:text-orange-400 transition-all bg-orange-50/70 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30"
                >
                  <Calendar size={11} /> Follow-Up
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Spotlight Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-24 pointer-events-none">
          <div 
            ref={searchModalRef}
            className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[60vh] animate-scale-in pointer-events-auto"
          >
            {/* Input field */}
            <div className="relative border-b border-border p-4 flex items-center">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari lead berdasarkan nama, WhatsApp, atau email..."
                value={globalQuery}
                onChange={(e) => handleGlobalQueryChange(e.target.value)}
                className="w-full pl-10 pr-10 py-2 text-sm text-foreground bg-transparent border-0 outline-none placeholder:text-muted-foreground/60"
              />
              {globalQuery && (
                <button
                  onClick={() => setGlobalQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-2 min-h-[150px]">
              {globalLoading ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <RefreshCw className="animate-spin text-primary" size={16} />
                  <p className="text-xs text-muted-foreground">Mencari data...</p>
                </div>
              ) : globalResults.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/50 text-xs">
                  {globalQuery.trim().length >= 2 ? 'Tidak ada lead ditemukan.' : 'Ketik minimal 2 karakter untuk memulai pencarian...'}
                </div>
              ) : (
                <div className="space-y-1">
                  {globalResults.map((lead: any) => (
                    <Link
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      onClick={closeSearch}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group"
                    >
                      <div>
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{lead.full_name}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">{lead.whatsapp_number} | {lead.source_campaign}</p>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border border-purple-100/50 dark:border-purple-900/30 uppercase tracking-wide">
                        {lead.current_status}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

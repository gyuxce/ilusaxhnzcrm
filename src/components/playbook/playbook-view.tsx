'use client'

import { useState } from 'react'
import { Search, Copy, CheckCheck, BookOpen, MessageSquare, AlertTriangle, Package, FileText, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlaybookItem, PlaybookCategory } from '@/lib/supabase/types'

const CATEGORIES: { key: PlaybookCategory | 'all'; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'all', label: 'Semua', icon: BookOpen, color: '#8b5cf6' },
  { key: 'script', label: 'Script WA', icon: MessageSquare, color: '#3b82f6' },
  { key: 'objection', label: 'Objection', icon: AlertTriangle, color: '#f97316' },
  { key: 'product', label: 'Produk', icon: Package, color: '#22c55e' },
  { key: 'sop', label: 'SOP', icon: FileText, color: '#eab308' },
  { key: 'faq', label: 'FAQ', icon: HelpCircle, color: '#06b6d4' },
]

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  script: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  objection: { color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
  product: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  sop: { color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
  faq: { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
}

const STATUS_GUIDE = [
  { status: 'New Lead', meaning: 'Lead baru masuk dan belum diproses CRO.', next: 'Assign PIC dan mulai pitching.' },
  { status: 'Pitching', meaning: 'Tim sudah mulai menawarkan program atau menggali kebutuhan.', next: 'Update ke Interested atau Not Interested.' },
  { status: 'Interested', meaning: 'Lead menunjukkan minat dan layak didorong ke tahap berikutnya.', next: 'Jadwalkan pemetaan.' },
  { status: 'Not Interested', meaning: 'Lead menolak atau tidak ingin lanjut saat ini.', next: 'Isi alasan lost/drop-off.' },
  { status: 'Not Eligible', meaning: 'Lead tidak memenuhi kriteria program.', next: 'Isi alasan agar bisa direkap.' },
  { status: 'Pemetaan Scheduled', meaning: 'Sesi pemetaan sudah dijadwalkan.', next: 'Follow up sampai masuk Waiting Result.' },
  { status: 'Waiting Result', meaning: 'Sesi/form sudah berjalan dan menunggu hasil pemetaan.', next: 'Jika hasil siap, jadwalkan expert consultation.' },
  { status: 'Expert Consultation Scheduled', meaning: 'Konsultasi dengan expert sudah dijadwalkan.', next: 'Follow up hasil konsultasi dan arahkan seat lock.' },
  { status: 'Seat Lock Offered', meaning: 'Lead sudah ditawari pembayaran seat lock.', next: 'Follow up pembayaran seat lock.' },
  { status: 'Seat Lock Paid', meaning: 'Seat lock sudah dibayar dan diverifikasi.', next: 'Masuk proses onboarding.' },
  { status: 'Onboarding', meaning: 'Lead sudah masuk proses persiapan kelas/program.', next: 'Lengkapi kebutuhan administrasi.' },
]

interface PlaybookViewProps {
  items: PlaybookItem[]
}

export function PlaybookView({ items }: PlaybookViewProps) {
  const [category, setCategory] = useState<PlaybookCategory | 'all'>('all')
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  const filtered = items.filter(item => {
    const matchCat = category === 'all' || item.category === category
    const matchSearch = !search || 
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.content.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  async function copyToClipboard(id: string, content: string) {
    await navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Kamus Status Pipeline</h2>
            <p className="text-xs text-muted-foreground mt-1">Acuan singkat agar semua CRO memakai status dengan definisi yang sama.</p>
          </div>
          <span className="text-xs text-muted-foreground">{STATUS_GUIDE.length} status aktif</span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {STATUS_GUIDE.map(item => (
            <div key={item.status} className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-extrabold text-foreground">{item.status}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.meaning}</p>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-primary">{item.next}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          const isActive = category === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border cursor-pointer',
                isActive
                  ? 'text-primary border-primary/20'
                  : 'text-muted-foreground hover:text-foreground bg-card border-border dark:bg-slate-800/40 dark:border-white/5'
              )}
              style={isActive
                ? { background: `${cat.color}15`, borderColor: `${cat.color}30`, color: cat.color }
                : undefined
              }
            >
              <Icon size={14} />
              {cat.label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={isActive
                  ? { background: `${cat.color}25` }
                  : { background: 'rgba(0,0,0,0.04)' }
                }
              >
                {cat.key === 'all' ? items.length : items.filter(i => i.category === cat.key).length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari script, SOP, atau topik..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-card text-foreground border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/60 dark:bg-slate-800/30 dark:border-white/10"
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-card text-card-foreground border border-border dark:border-white/5 rounded-2xl p-12 text-center shadow-xs">
          <div className="text-4xl mb-3">📖</div>
          <p className="text-foreground/80 font-medium">Tidak ada item ditemukan</p>
          <p className="text-sm text-muted-foreground mt-1">Coba ubah filter atau kata kunci</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(item => {
            const catColors = CATEGORY_COLORS[item.category] || { color: '#64748b', bg: 'rgba(100,116,139,0.1)' }
            const isCopied = copied === item.id

            return (
              <div key={item.id} className="bg-card text-card-foreground border border-border dark:border-white/5 rounded-2xl p-5 flex flex-col gap-3 group hover:border-border-hover dark:hover:border-white/10 transition-all shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className="inline-block text-xs px-2.5 py-0.5 rounded-full font-medium mb-2 capitalize"
                      style={{ background: catColors.bg, color: catColors.color }}
                    >
                      {item.category}
                    </span>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.id, item.content)}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all border",
                      isCopied
                        ? "bg-emerald-50 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground hover:text-foreground border-border/50 dark:border-white/5 cursor-pointer"
                    )}
                  >
                    {isCopied ? <CheckCheck size={12} /> : <Copy size={12} />}
                    {isCopied ? 'Tersalin!' : 'Salin'}
                  </button>
                </div>

                <div
                  className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap p-3 rounded-xl bg-muted/40 border border-border/40 dark:bg-white/[0.02] dark:border-white/5"
                >
                  {item.content}
                </div>

                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground cursor-pointer transition-colors border border-border/20 dark:bg-white/5 dark:border-white/5"
                        onClick={() => setSearch(tag)}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

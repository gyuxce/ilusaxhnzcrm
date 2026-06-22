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
      item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  async function copyToClipboard(id: string, content: string) {
    await navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-5">
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
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                isActive ? 'text-white' : 'text-white/50 hover:text-white/70'
              )}
              style={isActive
                ? { background: `${cat.color}20`, border: `1px solid ${cat.color}40`, color: cat.color }
                : { background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,18%)' }
              }
            >
              <Icon size={14} />
              {cat.label}
              <span
                className="text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: isActive ? `${cat.color}30` : 'rgba(255,255,255,0.05)' }}
              >
                {cat.key === 'all' ? items.length : items.filter(i => i.category === cat.key).length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari script, SOP, atau topik..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-white/25 outline-none"
          style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📖</div>
          <p className="text-white/60 font-medium">Tidak ada item ditemukan</p>
          <p className="text-sm text-white/30 mt-1">Coba ubah filter atau kata kunci</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(item => {
            const catColors = CATEGORY_COLORS[item.category] || { color: '#64748b', bg: 'rgba(100,116,139,0.1)' }
            const isCopied = copied === item.id

            return (
              <div key={item.id} className="glass-card rounded-2xl p-5 flex flex-col gap-3 group hover:border-white/10 transition-all">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className="inline-block text-xs px-2.5 py-0.5 rounded-full font-medium mb-2 capitalize"
                      style={{ background: catColors.bg, color: catColors.color }}
                    >
                      {item.category}
                    </span>
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.id, item.content)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all"
                    style={isCopied
                      ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e' }
                      : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }
                    }
                  >
                    {isCopied ? <CheckCheck size={12} /> : <Copy size={12} />}
                    {isCopied ? 'Tersalin!' : 'Salin'}
                  </button>
                </div>

                <div
                  className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  {item.content}
                </div>

                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map(tag => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded-full text-white/40 cursor-pointer hover:text-white/60 transition-colors"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
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

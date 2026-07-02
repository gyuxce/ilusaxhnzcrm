'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CalendarDays, CheckCircle2, Clock, ExternalLink, Search, UserRoundCheck, WalletCards } from 'lucide-react'

type ExpertQueueItem = {
  id: string
  lead_id: string
  created_by: string | null
  lead_condition: string | null
  objection_category: string | null
  solution_given: string | null
  expert_needed: boolean
  expert_type: string | null
  commercial_type: string | null
  service_opportunity: string | null
  next_action: string | null
  next_follow_up_date: string | null
  result: string | null
  notes: string | null
  created_at: string
  users?: { id?: string; name?: string } | null
  leads?: {
    id: string
    full_name: string
    whatsapp_number: string
    source_campaign: string
    current_status: string
    assigned_cro_id?: string | null
    users?: { id?: string; name?: string } | null
  } | null
}

interface ExpertQueueDashboardProps {
  initialItems: ExpertQueueItem[]
}

const statusOptions = ['all', 'pending', 'done'] as const

function formatDate(dateValue: string | null) {
  if (!dateValue) return '-'
  return new Date(dateValue).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isOverdue(dateValue: string | null, done: boolean) {
  if (!dateValue || done) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const date = new Date(dateValue)
  date.setHours(0, 0, 0, 0)
  return date.getTime() < today.getTime()
}

export function ExpertQueueDashboard({ initialItems }: ExpertQueueDashboardProps) {
  const [items, setItems] = useState(initialItems)
  const [query, setQuery] = useState('')
  const [expertType, setExpertType] = useState('all')
  const [commercialType, setCommercialType] = useState('all')
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('all')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const expertTypes = useMemo(() => {
    return Array.from(new Set(items.map(item => item.expert_type).filter(Boolean) as string[])).sort()
  }, [items])

  const commercialTypes = useMemo(() => {
    return Array.from(new Set(items.map(item => item.commercial_type).filter(Boolean) as string[])).sort()
  }, [items])

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return items.filter(item => {
      const done = Boolean(item.result)
      if (status === 'pending' && done) return false
      if (status === 'done' && !done) return false
      if (expertType !== 'all' && item.expert_type !== expertType) return false
      if (commercialType !== 'all' && item.commercial_type !== commercialType) return false
      if (!keyword) return true

      return [
        item.leads?.full_name,
        item.leads?.whatsapp_number,
        item.leads?.source_campaign,
        item.leads?.current_status,
        item.users?.name,
        item.lead_condition,
        item.objection_category,
        item.solution_given,
        item.expert_type,
        item.commercial_type,
        item.service_opportunity,
        item.next_action,
        item.result,
        item.notes,
      ]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(keyword))
    })
  }, [items, query, expertType, commercialType, status])

  const stats = useMemo(() => {
    const pending = items.filter(item => !item.result).length
    const done = items.filter(item => item.result).length
    const potentialPaid = items.filter(item => item.commercial_type === 'Potential Paid' || item.commercial_type === 'Paid').length
    const overdue = items.filter(item => isOverdue(item.next_follow_up_date, Boolean(item.result))).length
    return { total: items.length, pending, done, potentialPaid, overdue }
  }, [items])

  const markDone = async (item: ExpertQueueItem) => {
    const result = window.prompt('Isi hasil expert / catatan singkat:', item.result || '')
    if (result === null) return
    const cleanResult = result.trim()
    if (!cleanResult) return

    setUpdatingId(item.id)
    const supabase = createClient()
    const { error } = await supabase
      .from('lead_interventions')
      .update({
        result: cleanResult,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    setUpdatingId(null)

    if (error) {
      alert('Gagal update hasil expert: ' + error.message)
      return
    }

    setItems(prev => prev.map(row => row.id === item.id ? { ...row, result: cleanResult } : row))
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Queue', value: stats.total, icon: UserRoundCheck, tone: 'hsl(250,84%,64%)' },
          { label: 'Pending', value: stats.pending, icon: Clock, tone: 'hsl(38,92%,50%)' },
          { label: 'Done', value: stats.done, icon: CheckCircle2, tone: 'hsl(160,84%,39%)' },
          { label: 'Potential Paid', value: stats.potentialPaid, icon: WalletCards, tone: 'hsl(210,100%,56%)' },
          { label: 'Overdue', value: stats.overdue, icon: CalendarDays, tone: 'hsl(0,72%,51%)' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">{card.label}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${card.tone}20` }}>
                <card.icon size={16} style={{ color: card.tone }} />
              </div>
            </div>
            <p className="mt-5 text-3xl font-black text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_180px_160px] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Cari lead, objection, service opportunity..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>

          <select value={expertType} onChange={event => setExpertType(event.target.value)} className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none">
            <option value="all">Semua expert</option>
            {expertTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>

          <select value={commercialType} onChange={event => setCommercialType(event.target.value)} className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none">
            <option value="all">Semua commercial</option>
            {commercialTypes.map(type => <option key={type} value={type}>{type}</option>)}
          </select>

          <select value={status} onChange={event => setStatus(event.target.value as any)} className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none">
            <option value="all">Semua status</option>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground dark:bg-white/[0.02]">
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Expert Need</th>
                <th className="px-4 py-3">Objection & Solusi</th>
                <th className="px-4 py-3">Commercial</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Result</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    Tidak ada expert queue yang cocok.
                  </td>
                </tr>
              ) : filteredItems.map(item => {
                const done = Boolean(item.result)
                const overdue = isOverdue(item.next_follow_up_date, done)
                return (
                  <tr key={item.id} className="align-top hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-4 min-w-56">
                      {item.leads ? (
                        <Link href={`/leads/${item.leads.id}`} className="font-extrabold text-foreground hover:text-primary hover:underline">
                          {item.leads.full_name}
                        </Link>
                      ) : (
                        <p className="font-extrabold text-foreground">Lead tidak ditemukan</p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">{item.leads?.source_campaign || '-'}</p>
                      <p className="text-[11px] text-muted-foreground">CRO: {item.users?.name || item.leads?.users?.name || '-'}</p>
                    </td>

                    <td className="px-4 py-4 min-w-44">
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                        {item.expert_type || 'Expert Needed'}
                      </span>
                      <p className="mt-2 text-xs text-muted-foreground">{item.lead_condition || '-'}</p>
                    </td>

                    <td className="px-4 py-4 min-w-72">
                      <p className="font-bold text-foreground">{item.objection_category || '-'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Solusi: {item.solution_given || '-'}</p>
                      {item.notes && <p className="mt-1 text-[11px] text-muted-foreground">Notes: {item.notes}</p>}
                    </td>

                    <td className="px-4 py-4 min-w-48">
                      <span className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-black',
                        item.commercial_type === 'Paid' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' :
                        item.commercial_type === 'Potential Paid' ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {item.commercial_type || 'Free'}
                      </span>
                      {item.service_opportunity && (
                        <p className="mt-2 text-xs text-muted-foreground">{item.service_opportunity}</p>
                      )}
                    </td>

                    <td className="px-4 py-4 min-w-44">
                      <p className="font-semibold text-foreground">{item.next_action || '-'}</p>
                      <p className={cn('mt-1 text-xs', overdue ? 'font-bold text-red-600 dark:text-red-300' : 'text-muted-foreground')}>
                        {formatDate(item.next_follow_up_date)}
                      </p>
                    </td>

                    <td className="px-4 py-4 min-w-56">
                      {done ? (
                        <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          {item.result}
                        </p>
                      ) : (
                        <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                          Menunggu hasil expert
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-4 min-w-36">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/leads/${item.lead_id}`}
                          className="rounded-lg border border-border p-2 text-primary hover:bg-primary/10"
                          title="Buka lead"
                        >
                          <ExternalLink size={14} />
                        </Link>
                        {!done && (
                          <button
                            type="button"
                            onClick={() => markDone(item)}
                            disabled={updatingId === item.id}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {updatingId === item.id ? '...' : 'Done'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

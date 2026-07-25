'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ClipboardCheck, AlertCircle, Clock3, UserRoundCheck, Loader2 } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/language'
import { TODAY_TOOLS } from '@/lib/navigation'
import { NEEDS_ACTION_STATUSES } from '@/lib/funnel-framework'
import { getTodayInWIB } from '@/lib/utils'

type Counts = {
  work: number
  needs: number
  followUps: number
  expert: number
}

const COPY = {
  id: {
    title: 'Hari Ini',
    subtitle: 'Satu pintu kerja harian CRO. Pilih antrian, kerjakan, lalu lanjut.',
    intro: 'Data lead diubah dari sini (atau Detail Lead). Pipeline & Laporan hanya untuk pantau.',
    start: 'Mulai kerja',
    loading: 'Memuat antrian...',
    items: 'item',
  },
  en: {
    title: 'Today',
    subtitle: 'One door for CRO daily work. Pick a queue, work it, move on.',
    intro: 'Change lead data here (or Lead Detail). Pipeline & Reports are for monitoring only.',
    start: 'Start working',
    loading: 'Loading queues...',
    items: 'items',
  },
} as const

const ICONS = {
  work: ClipboardCheck,
  needs: AlertCircle,
  followUps: Clock3,
  expert: UserRoundCheck,
} as const

export default function TodayPage() {
  const { lang } = useLanguage()
  const c = COPY[lang]
  const supabase = createClient()
  const [counts, setCounts] = useState<Counts>({ work: 0, needs: 0, followUps: 0, expert: 0 })
  const [loading, setLoading] = useState(true)

  const fetchCounts = useCallback(async () => {
    setLoading(true)
    const today = getTodayInWIB()

    const [needsRes, fuRes, newRes, expertRes] = await Promise.all([
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .in('current_status', NEEDS_ACTION_STATUSES),
      supabase
        .from('follow_ups')
        .select('*', { count: 'exact', head: true })
        .eq('is_done', false)
        .lte('scheduled_date', today),
      supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('current_status', 'New Lead'),
      supabase
        .from('lead_interventions')
        .select('lead_id, expert_needed, expert_type, result')
        .eq('expert_needed', true)
        .limit(2000),
    ])

    type ExpertRow = { lead_id: string; expert_needed: boolean | null; expert_type: string | null; result: string | null }
    const expertRows = (expertRes.data || []) as ExpertRow[]
    const expertPending = new Set(
      expertRows.filter((row) => !row.result).map((row) => row.lead_id)
    ).size

    const needs = needsRes.count || 0
    const followUps = fuRes.count || 0
    const fresh = newRes.count || 0

    setCounts({
      work: fresh + needs + followUps,
      needs,
      followUps,
      expert: expertPending,
    })
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchCounts()
  }, [fetchCounts])

  return (
    <>
      <Header title={c.title} subtitle={c.subtitle} />
      <div className="w-full p-6 space-y-6 animate-fade-in">
        <div className="rounded-2xl border border-border bg-card px-5 py-4">
          <p className="font-display text-xl font-semibold text-foreground tracking-tight">
            {c.title}
          </p>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            {c.intro}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TODAY_TOOLS.map((tool) => {
            const Icon = ICONS[tool.key]
            const count = counts[tool.key]
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:bg-secondary/40 hover:border-primary/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-secondary text-accent flex items-center justify-center border border-border">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {lang === 'en' ? tool.labelEn : tool.labelId}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-sm">
                        {lang === 'en' ? tool.descEn : tool.descId}
                      </p>
                    </div>
                  </div>
                  <ArrowRight
                    size={16}
                    className="text-muted-foreground group-hover:text-accent group-hover:translate-x-0.5 transition-all mt-1"
                  />
                </div>
                <div className="mt-4 flex items-end justify-between">
                  {loading ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 size={12} className="animate-spin" />
                      {c.loading}
                    </span>
                  ) : (
                    <p className="font-display text-3xl font-semibold tracking-tight text-foreground">
                      {count}
                      <span className="ml-2 text-xs font-sans font-medium text-muted-foreground">
                        {c.items}
                      </span>
                    </p>
                  )}
                  <span className="text-[11px] font-semibold text-accent">{c.start}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}

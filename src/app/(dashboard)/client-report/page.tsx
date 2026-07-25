'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { LaporanSubnav } from '@/components/layout/laporan-subnav'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/language'
import {
  FUNNEL_STAGES,
  PRODUCT,
  countLeadsByFunnelStage,
  isLostOutcomeStatus,
  isWonStatus,
} from '@/lib/brand'
import { getTodayInWIB } from '@/lib/utils'
import type { LeadRow } from '@/lib/supabase/types'

type LeadSummary = Pick<
  LeadRow,
  'id' | 'full_name' | 'current_status' | 'source_campaign' | 'updated_at' | 'lead_entry_date' | 'lost_reason'
>

const COPY = {
  id: {
    title: 'Laporan Klien',
    subtitle: 'Ringkas, mudah dijelaskan ke owner/klien — tanpa jargon operasional.',
    intro: `${PRODUCT.shortName} · ${PRODUCT.partnership}`,
    kpiIn: 'Lead masuk (total)',
    kpiActive: 'Masih aktif',
    kpiWin: 'Closing berhasil',
    kpiLost: 'Tidak lanjut',
    funnel: 'Alur tahap 1–6',
    funnelHint: 'Angka di setiap tahap = berapa lead yang sedang di situ.',
    wins: 'Closing berhasil minggu ini',
    lost: 'Tidak lanjut minggu ini',
    topLost: 'Alasan tidak lanjut terbanyak',
    emptyLost: 'Belum ada pola alasan.',
    emptyState: 'Belum ada data lead untuk ditampilkan.',
    note: 'Ini tab di dalam Dashboard. Detail operasional (kerja CRO) ada di menu tim.',
    openTeam: 'Ke ringkasan Dashboard',
  },
  en: {
    title: 'Client Report',
    subtitle: 'Clean summary for owners/clients — no operational jargon.',
    intro: `${PRODUCT.shortName} · ${PRODUCT.partnership}`,
    kpiIn: 'Leads in (total)',
    kpiActive: 'Still active',
    kpiWin: 'Closing succeeded',
    kpiLost: 'Not continuing',
    funnel: 'Stages 1–6',
    funnelHint: 'Each stage shows how many leads are there now.',
    wins: 'Closing succeeded this week',
    lost: 'Not continuing this week',
    topLost: 'Top reasons not continuing',
    emptyLost: 'No patterns yet.',
    emptyState: 'No lead data to show yet.',
    note: 'This is a tab inside Dashboard. Daily CRO work lives in the team menu.',
    openTeam: 'Back to Dashboard overview',
  },
} as const

function startOfWeekWIB(today: string): string {
  const [y, m, d] = today.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const day = date.getUTCDay()
  const mondayOffset = day === 0 ? 6 : day - 1
  date.setUTCDate(date.getUTCDate() - mondayOffset)
  return date.toISOString().slice(0, 10)
}

export default function ClientReportPage() {
  const { lang } = useLanguage()
  const c = COPY[lang]
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadSummary[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('leads')
      .select('id, full_name, current_status, source_campaign, updated_at, lead_entry_date, lost_reason')
      .limit(5000)
    setLeads((data || []) as LeadSummary[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const today = getTodayInWIB()
  const weekStart = startOfWeekWIB(today)

  const stats = useMemo(() => {
    const total = leads.length
    const won = leads.filter((l) => isWonStatus(l.current_status)).length
    const lost = leads.filter((l) => isLostOutcomeStatus(l.current_status)).length
    const active = total - won - lost
    const winWeek = leads.filter((l) => {
      if (!isWonStatus(l.current_status)) return false
      const stamp = (l.updated_at || l.lead_entry_date || '').slice(0, 10)
      return stamp >= weekStart
    }).length
    const lostWeek = leads.filter((l) => {
      if (!isLostOutcomeStatus(l.current_status)) return false
      const stamp = (l.updated_at || l.lead_entry_date || '').slice(0, 10)
      return stamp >= weekStart
    }).length

    const reasonCounts: Record<string, number> = {}
    leads.forEach((l) => {
      if (!isLostOutcomeStatus(l.current_status) || !l.lost_reason) return
      reasonCounts[l.lost_reason] = (reasonCounts[l.lost_reason] || 0) + 1
    })
    const topLost = Object.entries(reasonCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return { total, active, won, lost, winWeek, lostWeek, topLost }
  }, [leads, weekStart])

  const stageCounts = useMemo(() => countLeadsByFunnelStage(leads), [leads])
  const maxStage = Math.max(1, ...stageCounts.map((s) => s.count))

  return (
    <>
      <Header title={c.title} subtitle={c.subtitle} />
      <div className="w-full p-6 space-y-6 animate-fade-in">
        <LaporanSubnav />

        <section className="rounded-2xl border border-border bg-card p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">{c.intro}</p>
          <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-2">
            {c.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">{c.subtitle}</p>
        </section>

        {!loading && leads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/40 px-6 py-16 text-center">
            <p className="font-display text-lg font-semibold text-foreground">{c.emptyState}</p>
            <p className="text-sm text-muted-foreground mt-2">{c.note}</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: c.kpiIn, value: stats.total },
                { label: c.kpiActive, value: stats.active },
                { label: c.kpiWin, value: stats.won },
                { label: c.kpiLost, value: stats.lost },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-[11px] font-semibold text-muted-foreground">{kpi.label}</p>
                  <p className="font-display text-3xl font-semibold tracking-tight text-foreground mt-2 tabular-nums">
                    {loading ? '—' : kpi.value}
                  </p>
                </div>
              ))}
            </div>

            <section className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">{c.funnel}</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">{c.funnelHint}</p>
              <div className="space-y-3">
                {FUNNEL_STAGES.map((stage) => {
                  const count = stageCounts.find((s) => s.stageId === stage.id)?.count || 0
                  const pct = Math.round((count / maxStage) * 100)
                  return (
                    <div key={stage.id}>
                      <div className="flex items-center gap-3 mb-1">
                        <span
                          className="w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center text-white"
                          style={{ background: stage.color }}
                        >
                          {stage.id}
                        </span>
                        <span className="text-sm font-medium text-foreground flex-1">
                          {lang === 'en' ? stage.labelEn : stage.labelId}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">{loading ? '—' : count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden ml-9">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: loading ? '0%' : `${Math.max(pct, count > 0 ? 6 : 0)}%`,
                            background: stage.color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground">{c.wins}</h3>
                <p className="font-display text-4xl font-semibold tracking-tight text-foreground mt-3 tabular-nums">
                  {loading ? '—' : stats.winWeek}
                </p>
                <p className="text-xs text-muted-foreground mt-2">{c.lost}: {loading ? '—' : stats.lostWeek}</p>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground">{c.topLost}</h3>
                {loading ? (
                  <p className="text-sm text-muted-foreground mt-3">...</p>
                ) : stats.topLost.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-3">{c.emptyLost}</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {stats.topLost.map((row) => (
                      <li
                        key={row.label}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
                      >
                        <span className="text-sm text-foreground truncate">{row.label}</span>
                        <span className="text-sm font-semibold tabular-nums">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}

        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">{c.note}</p>
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-accent hover:opacity-80"
          >
            {c.openTeam} →
          </Link>
        </div>
      </div>
    </>
  )
}

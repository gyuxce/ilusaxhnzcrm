'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ClipboardCheck,
  AlertTriangle,
  Trophy,
  UserX,
  Users,
  Wallet,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { LaporanSubnav } from '@/components/layout/laporan-subnav'
import { createClient } from '@/lib/supabase/client'
import { useLanguage, type Language } from '@/lib/language'
import {
  FUNNEL_STAGES,
  countLeadsByFunnelStage,
  isLostOutcomeStatus,
  isWonStatus,
} from '@/lib/brand'
import { NEEDS_ACTION_STATUSES } from '@/lib/funnel-framework'
import { getTodayInWIB } from '@/lib/utils'
import type { LeadInterventionRow, LeadRow, PaymentRow } from '@/lib/supabase/types'

type LeadSummary = Pick<
  LeadRow,
  'id' | 'full_name' | 'current_status' | 'source_campaign' | 'updated_at' | 'lead_entry_date'
>

type InterventionSummary = Pick<
  LeadInterventionRow,
  'lead_id' | 'objection_category' | 'result' | 'created_at'
>

type StalePreview = { id: string; name: string; status: string; days: number }

type DashboardStatsCache = {
  at: number
  leads: LeadSummary[]
  newToday: number
  workCount: number
  stuckCount: number
  winWeek: number
  lostWeek: number
  stalePreview: StalePreview[]
  topObjections: { label: string; count: number }[]
  revenue: { map: number; seat: number; total: number }
}

/** Keep Overview snappy when toggling Laporan tabs. */
let dashboardStatsCache: DashboardStatsCache | null = null
const DASHBOARD_CACHE_MS = 30_000

const COPY = {
  en: {
    title: 'Reports',
    subtitle: 'Five numbers that matter — then the funnel and what needs attention.',
    kpiToday: 'New leads today',
    kpiTodayHint: 'Entered today (WIB)',
    kpiWork: 'Need contact today',
    kpiWorkHint: 'Open Today workspace',
    kpiStuck: 'Stuck / needs action',
    kpiStuckHint: 'Waiting on schedule or result',
    kpiWin: 'Seat lock this week',
    kpiWinHint: 'Paid / onboarding this week',
    kpiLost: 'Lost this week',
    kpiLostHint: 'Not interested / not eligible',
    funnelTitle: 'Funnel stages 1–6',
    funnelHint: 'Click a stage to open matching leads in Pipeline / Leads.',
    attentionTitle: 'Needs attention',
    attentionHint: 'Active leads with no update for 3+ days.',
    attentionEmpty: 'No stale leads right now.',
    lostTitle: 'Top lost reasons',
    lostHint: 'From recent CRO handling notes.',
    lostEmpty: 'No lost-reason patterns yet.',
    revenueTitle: 'Revenue (secondary)',
    revenueHint: 'Verified payments — details in Payments.',
    revenueMap: 'Mapping',
    revenueSeat: 'Seat lock',
    revenueTotal: 'Total',
    viewPayments: 'Open payments',
    days: 'd',
    openToday: 'Go to Today',
  },
  id: {
    title: 'Laporan',
    subtitle: 'Lima angka penting — lalu funnel dan yang perlu perhatian.',
    kpiToday: 'Lead masuk hari ini',
    kpiTodayHint: 'Masuk hari ini (WIB)',
    kpiWork: 'Perlu dihubungi',
    kpiWorkHint: 'Buka workspace Hari Ini',
    kpiStuck: 'Stuck / needs action',
    kpiStuckHint: 'Menunggu jadwal atau hasil',
    kpiWin: 'Seat lock minggu ini',
    kpiWinHint: 'Paid / onboarding minggu ini',
    kpiLost: 'Lost minggu ini',
    kpiLostHint: 'Not interested / not eligible',
    funnelTitle: 'Funnel tahap 1–6',
    funnelHint: 'Klik tahap untuk melihat lead terkait.',
    attentionTitle: 'Butuh perhatian',
    attentionHint: 'Lead aktif tanpa update ≥ 3 hari.',
    attentionEmpty: 'Tidak ada lead stale saat ini.',
    lostTitle: 'Top alasan gagal',
    lostHint: 'Dari catatan handling CRO terbaru.',
    lostEmpty: 'Belum ada pola alasan gagal.',
    revenueTitle: 'Revenue (sekunder)',
    revenueHint: 'Pembayaran verified — detail di menu Pembayaran.',
    revenueMap: 'Pemetaan',
    revenueSeat: 'Seat lock',
    revenueTotal: 'Total',
    viewPayments: 'Buka pembayaran',
    days: 'hr',
    openToday: 'Ke Hari Ini',
  },
} as const

function startOfWeekWIB(today: string): string {
  const [y, m, d] = today.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const day = date.getUTCDay() // 0 Sun
  const mondayOffset = day === 0 ? 6 : day - 1
  date.setUTCDate(date.getUTCDate() - mondayOffset)
  return date.toISOString().slice(0, 10)
}

function MetricSkeleton() {
  return <div className="h-8 w-16 animate-pulse rounded-lg bg-muted" />
}

export default function DashboardPage() {
  const { lang } = useLanguage()
  const c = COPY[lang as Language]
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadSummary[]>([])
  const [newToday, setNewToday] = useState(0)
  const [workCount, setWorkCount] = useState(0)
  const [stuckCount, setStuckCount] = useState(0)
  const [winWeek, setWinWeek] = useState(0)
  const [lostWeek, setLostWeek] = useState(0)
  const [stalePreview, setStalePreview] = useState<StalePreview[]>([])
  const [topObjections, setTopObjections] = useState<{ label: string; count: number }[]>([])
  const [revenue, setRevenue] = useState({ map: 0, seat: 0, total: 0 })

  const applyCache = useCallback((cache: DashboardStatsCache) => {
    setLeads(cache.leads)
    setNewToday(cache.newToday)
    setWorkCount(cache.workCount)
    setStuckCount(cache.stuckCount)
    setWinWeek(cache.winWeek)
    setLostWeek(cache.lostWeek)
    setStalePreview(cache.stalePreview)
    setTopObjections(cache.topObjections)
    setRevenue(cache.revenue)
    setLoading(false)
  }, [])

  const fetchStats = useCallback(async () => {
    if (dashboardStatsCache && Date.now() - dashboardStatsCache.at < DASHBOARD_CACHE_MS) {
      applyCache(dashboardStatsCache)
      return
    }

    setLoading(true)
    const today = getTodayInWIB()
    const weekStart = startOfWeekWIB(today)

    const [leadsRes, fuRes, paymentsRes, interventionsRes] = await Promise.all([
      supabase
        .from('leads')
        .select('id, full_name, current_status, source_campaign, updated_at, lead_entry_date')
        .limit(3000),
      supabase
        .from('follow_ups')
        .select('*', { count: 'exact', head: true })
        .eq('is_done', false)
        .lte('scheduled_date', today),
      supabase
        .from('payments')
        .select('payment_type, amount')
        .eq('verification_status', 'verified')
        .limit(3000),
      supabase
        .from('lead_interventions')
        .select('lead_id, objection_category, result, created_at')
        .order('created_at', { ascending: false })
        .limit(1500),
    ])

    const leadRows = (leadsRes.data || []) as LeadSummary[]

    const stuck = leadRows.filter((l) => NEEDS_ACTION_STATUSES.includes(l.current_status)).length
    const fresh = leadRows.filter((l) => l.current_status === 'New Lead').length
    const fuDue = fuRes.count || 0
    const nextWorkCount = fresh + stuck + fuDue
    const nextNewToday = leadRows.filter((l) => (l.lead_entry_date || '').slice(0, 10) === today).length

    const nextWinWeek = leadRows.filter((l) => {
      if (!isWonStatus(l.current_status)) return false
      const stamp = (l.updated_at || l.lead_entry_date || '').slice(0, 10)
      return stamp >= weekStart
    }).length

    const nextLostWeek = leadRows.filter((l) => {
      if (!isLostOutcomeStatus(l.current_status)) return false
      const stamp = (l.updated_at || l.lead_entry_date || '').slice(0, 10)
      return stamp >= weekStart
    }).length

    const now = Date.now()
    const nextStale = leadRows
      .filter((l) => !isWonStatus(l.current_status) && !isLostOutcomeStatus(l.current_status))
      .map((l) => {
        const last = l.updated_at || l.lead_entry_date
        const days = last ? Math.floor((now - new Date(last).getTime()) / 86400000) : 0
        return { id: l.id, name: l.full_name, status: l.current_status, days }
      })
      .filter((row) => row.days >= 3)
      .sort((a, b) => b.days - a.days)
      .slice(0, 6)

    const objectionCounts: Record<string, number> = {}
    ;((interventionsRes.data || []) as InterventionSummary[]).forEach((item) => {
      if (!item.objection_category) return
      objectionCounts[item.objection_category] = (objectionCounts[item.objection_category] || 0) + 1
    })
    const nextObjections = Object.entries(objectionCounts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    let map = 0
    let seat = 0
    ;((paymentsRes.data || []) as Pick<PaymentRow, 'payment_type' | 'amount'>[]).forEach((p) => {
      const amt = Number(p.amount) || 0
      if (p.payment_type === 'pemetaan' || p.payment_type === 'roadmap_session') map += amt
      else if (p.payment_type === 'seat_lock') seat += amt
    })
    const nextRevenue = { map, seat, total: map + seat }

    const cache: DashboardStatsCache = {
      at: Date.now(),
      leads: leadRows,
      newToday: nextNewToday,
      workCount: nextWorkCount,
      stuckCount: stuck,
      winWeek: nextWinWeek,
      lostWeek: nextLostWeek,
      stalePreview: nextStale,
      topObjections: nextObjections,
      revenue: nextRevenue,
    }
    dashboardStatsCache = cache
    applyCache(cache)
  }, [applyCache, supabase])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const stageCounts = useMemo(() => countLeadsByFunnelStage(leads), [leads])
  const maxStage = Math.max(1, ...stageCounts.map((s) => s.count))

  const kpis = [
    {
      key: 'today',
      label: c.kpiToday,
      hint: c.kpiTodayHint,
      value: newToday,
      href: '/leads',
      icon: Users,
    },
    {
      key: 'work',
      label: c.kpiWork,
      hint: c.kpiWorkHint,
      value: workCount,
      href: '/today',
      icon: ClipboardCheck,
    },
    {
      key: 'stuck',
      label: c.kpiStuck,
      hint: c.kpiStuckHint,
      value: stuckCount,
      href: '/needs-action',
      icon: AlertTriangle,
    },
    {
      key: 'win',
      label: c.kpiWin,
      hint: c.kpiWinHint,
      value: winWeek,
      href: '/conversions?type=seat_lock',
      icon: Trophy,
    },
    {
      key: 'lost',
      label: c.kpiLost,
      hint: c.kpiLostHint,
      value: lostWeek,
      href: '/playbook',
      icon: UserX,
    },
  ]

  return (
    <>
      <Header title={c.title} subtitle={c.subtitle} />
      <div className="w-full p-6 space-y-6 animate-fade-in">
        <LaporanSubnav />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
              {c.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{c.subtitle}</p>
          </div>
          <Link
            href="/today"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
          >
            <ClipboardCheck size={14} />
            {c.openToday}
          </Link>
        </div>

        {/* 5 KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <Link
                key={kpi.key}
                href={kpi.href}
                className="rounded-2xl border border-border bg-card p-4 hover:bg-secondary/40 transition-colors group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-muted-foreground leading-snug pr-2">
                    {kpi.label}
                  </span>
                  <Icon size={15} className="text-accent flex-shrink-0" />
                </div>
                {loading ? (
                  <MetricSkeleton />
                ) : (
                  <p className="font-display text-3xl font-semibold tracking-tight text-foreground">
                    {kpi.value}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  {kpi.hint}
                  <ArrowRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
              </Link>
            )
          })}
        </div>

        {/* Funnel 1–6 */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">{c.funnelTitle}</h3>
            <p className="text-xs text-muted-foreground mt-1">{c.funnelHint}</p>
          </div>
          <div className="space-y-3">
            {FUNNEL_STAGES.map((stage) => {
              const count = stageCounts.find((s) => s.stageId === stage.id)?.count || 0
              const pct = Math.round((count / maxStage) * 100)
              const label = lang === 'en' ? stage.labelEn : stage.labelId
              const href =
                stage.id === 6
                  ? '/conversions?type=seat_lock'
                  : `/leads?status=${encodeURIComponent(stage.statuses[0])}`
              return (
                <Link key={stage.id} href={href} className="block group">
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className="w-6 h-6 rounded-md text-[11px] font-bold flex items-center justify-center text-white"
                      style={{ background: stage.color }}
                    >
                      {stage.id}
                    </span>
                    <span className="text-sm font-medium text-foreground flex-1">{label}</span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {loading ? '—' : count}
                    </span>
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
                  <p className="text-[10px] text-muted-foreground mt-1 ml-9 group-hover:text-foreground transition-colors">
                    {stage.meaningId}
                  </p>
                </Link>
              )
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Needs attention */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-foreground">{c.attentionTitle}</h3>
              <p className="text-xs text-muted-foreground mt-1">{c.attentionHint}</p>
            </div>
            {loading ? (
              <div className="space-y-2">
                <MetricSkeleton />
                <MetricSkeleton />
              </div>
            ) : stalePreview.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.attentionEmpty}</p>
            ) : (
              <ul className="space-y-2">
                {stalePreview.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/leads/${row.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-secondary/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{row.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{row.status}</p>
                      </div>
                      <span className="text-xs font-semibold text-accent tabular-nums flex-shrink-0">
                        {row.days}
                        {c.days}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Top lost / objections */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">{c.lostTitle}</h3>
                <p className="text-xs text-muted-foreground mt-1">{c.lostHint}</p>
              </div>
              <Link href="/playbook" className="text-[11px] font-semibold text-accent hover:opacity-80">
                Detail
              </Link>
            </div>
            {loading ? (
              <div className="space-y-2">
                <MetricSkeleton />
                <MetricSkeleton />
              </div>
            ) : topObjections.length === 0 ? (
              <p className="text-sm text-muted-foreground">{c.lostEmpty}</p>
            ) : (
              <ul className="space-y-2">
                {topObjections.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                  >
                    <p className="text-sm text-foreground truncate">{row.label}</p>
                    <span className="text-sm font-semibold tabular-nums text-foreground">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Secondary revenue */}
        <section className="rounded-2xl border border-dashed border-border bg-secondary/30 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground inline-flex items-center gap-2">
                <Wallet size={14} className="text-accent" />
                {c.revenueTitle}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{c.revenueHint}</p>
            </div>
            <Link
              href="/conversions"
              className="text-[11px] font-semibold text-accent hover:opacity-80 inline-flex items-center gap-1"
            >
              {c.viewPayments}
              <ArrowRight size={11} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: c.revenueMap, value: revenue.map, href: '/conversions?type=pemetaan' },
              { label: c.revenueSeat, value: revenue.seat, href: '/conversions?type=seat_lock' },
              { label: c.revenueTotal, value: revenue.total, href: '/conversions' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-xl border border-border bg-card px-4 py-3 hover:bg-card/80 transition-colors"
              >
                <p className="text-[11px] text-muted-foreground font-medium">{item.label}</p>
                {loading ? (
                  <MetricSkeleton />
                ) : (
                  <p className="text-lg font-semibold text-foreground mt-1 tabular-nums">
                    Rp {item.value.toLocaleString('id-ID')}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

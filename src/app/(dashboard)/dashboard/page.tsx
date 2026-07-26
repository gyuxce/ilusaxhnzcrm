'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Users,
  ListChecks,
  KanbanSquare,
  Trophy,
  Wallet,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/language'
import { getTodayInWIB } from '@/lib/utils'
import {
  STAGE1_CURRENT_STATUS_OPTIONS,
  STAGE2_VISIBLE_STATUSES,
  STAGE3_STATUS_OPTIONS,
  STAGE3_BOARD_COLUMNS,
  isStage3WonStatus,
} from '@/lib/prd-stages'
import { readPrdTrialSinceClient, PRD_TRIAL_MODE_CHANGED } from '@/lib/prd-trial-mode'
import type { LeadRow, PaymentRow } from '@/lib/supabase/types'

type LeadSummary = Pick<LeadRow, 'id' | 'full_name' | 'current_status' | 'updated_at' | 'lead_entry_date'>

type StalePreview = { id: string; name: string; status: string; days: number }

const EXIT_STATUSES = ['Not Interested', 'Not Eligible', 'Cold Leads', 'Failed']

function includes(list: readonly string[], value: string) {
  return list.includes(value as never)
}

export default function DashboardPage() {
  const { lang } = useLanguage()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadSummary[]>([])
  const [revenue, setRevenue] = useState({ map: 0, seat: 0, total: 0 })
  const [stalePreview, setStalePreview] = useState<StalePreview[]>([])

  const fetchStats = useCallback(async () => {
    setLoading(true)
    const today = getTodayInWIB()

    let leadsQuery = supabase
      .from('leads')
      .select('id, full_name, current_status, updated_at, lead_entry_date')
      .limit(5000)
    const trialSince = readPrdTrialSinceClient()
    if (trialSince) leadsQuery = leadsQuery.gte('created_at', trialSince)

    const [leadsRes, paymentsRes] = await Promise.all([
      leadsQuery,
      supabase
        .from('payments')
        .select('lead_id, payment_type, amount')
        .eq('verification_status', 'verified')
        .limit(5000),
    ])

    const leadRows = (leadsRes.data || []) as LeadSummary[]
    setLeads(leadRows)

    let map = 0
    let seat = 0
    ;((paymentsRes.data || []) as Pick<PaymentRow, 'lead_id' | 'payment_type' | 'amount'>[]).forEach((p) => {
      const amt = Number(p.amount) || 0
      if (p.payment_type === 'pemetaan' || p.payment_type === 'roadmap_session') map += amt
      else if (p.payment_type === 'seat_lock') seat += amt
    })
    setRevenue({ map, seat, total: map + seat })

    const now = Date.now()
    const nextStale = leadRows
      .filter((l) => !isStage3WonStatus(l.current_status) && !EXIT_STATUSES.includes(l.current_status))
      .map((l) => {
        const last = l.updated_at || l.lead_entry_date
        const days = last ? Math.floor((now - new Date(last).getTime()) / 86400000) : 0
        return { id: l.id, name: l.full_name, status: l.current_status, days }
      })
      .filter((row) => row.days >= 3)
      .sort((a, b) => b.days - a.days)
      .slice(0, 6)
    setStalePreview(nextStale)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    const onTrialChange = () => void fetchStats()
    window.addEventListener(PRD_TRIAL_MODE_CHANGED, onTrialChange)
    return () => window.removeEventListener(PRD_TRIAL_MODE_CHANGED, onTrialChange)
  }, [fetchStats])

  const counts = useMemo(() => {
    const stage1 = leads.filter(
      (l) => includes(STAGE1_CURRENT_STATUS_OPTIONS, l.current_status) || l.current_status === 'New Lead'
    ).length
    const stage2 = leads.filter((l) => includes(STAGE2_VISIBLE_STATUSES, l.current_status)).length
    const stage3 = leads.filter((l) => includes(STAGE3_STATUS_OPTIONS, l.current_status)).length
    const won = leads.filter((l) => isStage3WonStatus(l.current_status)).length
    const exit = leads.filter((l) => EXIT_STATUSES.includes(l.current_status)).length
    const today = getTodayInWIB()
    const newToday = leads.filter((l) => (l.lead_entry_date || '').slice(0, 10) === today).length
    const byColumn = STAGE3_BOARD_COLUMNS.map((col) => ({
      key: col.key,
      label: col.label,
      color: col.color,
      soft: col.soft,
      count: leads.filter((l) => (col.statuses as readonly string[]).includes(l.current_status)).length,
    }))
    return { stage1, stage2, stage3, won, exit, newToday, byColumn }
  }, [leads])

  const kpis = [
    { key: 'today', labelId: 'Lead masuk hari ini', labelEn: 'New leads today', value: counts.newToday, href: '/leads', icon: Users },
    { key: 's1', labelId: 'Stage 1 (Input Manual / Bridging / Pitching)', labelEn: 'Stage 1 (Manual / Bridging / Pitching)', value: counts.stage1, href: '/leads', icon: Users },
    { key: 's2', labelId: 'Stage 2 (Interested)', labelEn: 'Stage 2 (Interested)', value: counts.stage2, href: '/stage-2', icon: ListChecks },
    { key: 's3', labelId: 'Stage 3 (Pipeline)', labelEn: 'Stage 3 (Pipeline)', value: counts.stage3, href: '/stage-3', icon: KanbanSquare },
    { key: 'won', labelId: 'Closing Seat Lock', labelEn: 'Closing Seat Lock', value: counts.won, href: '/stage-3', icon: Trophy },
  ]

  const isId = lang !== 'en'

  return (
    <>
      <Header title="Dashboard" subtitle="Ringkasan pipeline PRD V3 — Leads → Stage 2 → Stage 3." />
      <div className="w-full p-6 space-y-6 font-sans">
        {/* KPI PRD V3 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <Link key={kpi.key} href={kpi.href} className="rounded-2xl border border-border bg-card p-4 hover:bg-secondary/40 transition-colors group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-muted-foreground leading-snug pr-2">
                    {isId ? kpi.labelId : kpi.labelEn}
                  </span>
                  <Icon size={15} className="text-accent flex-shrink-0" />
                </div>
                {loading ? (
                  <div className="h-8 w-16 animate-pulse rounded-lg bg-muted" />
                ) : (
                  <p className="font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums">
                    {kpi.value}
                  </p>
                )}
              </Link>
            )
          })}
        </div>

        {/* Funnel PRD V3 */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold tracking-tight text-foreground">Funnel PRD V3</h3>
            <p className="text-xs text-muted-foreground mt-1">Stage 1 → Stage 2 → Stage 3 (Pemetaan → Expert → Seat Lock → Closing).</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <FunnelCard label="Stage 1" desc="Input Manual · Bridging · Pitching" count={counts.stage1} href="/leads" />
            <FunnelCard label="Stage 2" desc="Interested — jadwal pemetaan / expert" count={counts.stage2} href="/stage-2" />
            <FunnelCard label="Stage 3" desc="Pipeline Kanban menuju Closing" count={counts.stage3} href="/stage-3" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
            {counts.byColumn.map((col) => (
              <div key={col.key} className="rounded-xl border border-border px-3 py-2.5" style={{ background: col.soft, borderColor: col.color }}>
                <p className="truncate text-[10px] font-semibold" style={{ color: col.color }}>{col.label}</p>
                <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">{loading ? '–' : col.count}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-md border border-border bg-secondary/40 px-2 py-1">Closing Seat Lock: <b className="text-foreground">{loading ? '–' : counts.won}</b></span>
            <span className="rounded-md border border-border bg-secondary/40 px-2 py-1">Keluar (Not Interested / Cold / Failed): <b className="text-foreground">{loading ? '–' : counts.exit}</b></span>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Needs attention */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Butuh perhatian</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Lead aktif tanpa update ≥ 3 hari.</p>
              </div>
            </div>
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
              </div>
            ) : stalePreview.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tidak ada lead stale saat ini.</p>
            ) : (
              <ul className="space-y-2">
                {stalePreview.map((row) => (
                  <li key={row.id}>
                    <Link href={`/leads/${row.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-secondary/50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{row.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{row.status}</p>
                      </div>
                      <span className="text-xs font-semibold text-accent tabular-nums flex-shrink-0">{row.days} hr</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Revenue */}
          <section className="rounded-2xl border border-dashed border-border bg-secondary/30 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Wallet size={14} className="text-accent" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Revenue</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Pembayaran verified — detail di menu Pembayaran.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Pemetaan', value: revenue.map, href: '/conversions?type=pemetaan' },
                { label: 'Seat Lock', value: revenue.seat, href: '/conversions?type=seat_lock' },
                { label: 'Total', value: revenue.total, href: '/conversions' },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="rounded-xl border border-border bg-card px-4 py-3 hover:bg-card/80 transition-colors">
                  <p className="text-[11px] text-muted-foreground font-medium">{item.label}</p>
                  {loading ? (
                    <div className="mt-1 h-6 w-20 animate-pulse rounded bg-muted" />
                  ) : (
                    <p className="text-lg font-semibold text-foreground mt-1 tabular-nums">Rp {item.value.toLocaleString('id-ID')}</p>
                  )}
                </Link>
              ))}
            </div>
            <Link href="/conversions" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:opacity-80">
              Buka pembayaran <ArrowRight size={11} />
            </Link>
          </section>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Clock size={12} />
          Data sesuai status terbaru lead. Klik kartu untuk masuk ke menu terkait.
        </div>
      </div>
    </>
  )
}

function FunnelCard({ label, desc, count, href }: { label: string; desc: string; count: number; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-border bg-card p-4 hover:bg-secondary/40 transition-colors">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className="font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums mt-1">{count}</p>
      <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{desc}</p>
    </Link>
  )
}

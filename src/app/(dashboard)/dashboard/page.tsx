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
  STAGE3_ATTENTION_STATUSES,
  STAGE3_ATTENTION_STALE_DAYS,
  isStage3WonStatus,
} from '@/lib/prd-stages'
import { readPrdTrialSinceClient, PRD_TRIAL_MODE_CHANGED } from '@/lib/prd-trial-mode'
import { resolveEntity, ENTITIES, type Entity } from '@/lib/entity'
import { isLostOutcomeStatus } from '@/lib/brand'
import type { LeadRow, PaymentRow, CampaignEntityOverrideRow } from '@/lib/supabase/types'

type LeadSummary = Pick<LeadRow, 'id' | 'full_name' | 'current_status' | 'updated_at' | 'lead_entry_date' | 'last_contacted_date' | 'source_campaign'>

type StalePreview = { id: string; name: string; status: string; days: number }

function emptyByEntity<T>(value: () => T): Record<Entity, T> {
  return Object.fromEntries(ENTITIES.map((e) => [e, value()])) as Record<Entity, T>
}

function includes(list: readonly string[], value: string) {
  return list.includes(value as never)
}

export default function DashboardPage() {
  const { lang } = useLanguage()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadSummary[]>([])
  const [revenue, setRevenue] = useState({ map: 0, seat: 0, total: 0 })
  const [revenueByEntity, setRevenueByEntity] = useState<Record<Entity, { map: number; seat: number; total: number }>>(
    () => emptyByEntity(() => ({ map: 0, seat: 0, total: 0 }))
  )
  const [stalePreview, setStalePreview] = useState<StalePreview[]>([])
  const [campaignOverrides, setCampaignOverrides] = useState<ReadonlyMap<string, Entity>>(new Map())

  const fetchStats = useCallback(async () => {
    setLoading(true)

    let leadsQuery = supabase
      .from('leads')
      .select('id, full_name, current_status, updated_at, lead_entry_date, last_contacted_date, source_campaign')
      .limit(5000)
    const trialSince = readPrdTrialSinceClient()
    if (trialSince) leadsQuery = leadsQuery.gte('created_at', trialSince)

    const [leadsRes, paymentsRes, overridesRes] = await Promise.all([
      leadsQuery,
      supabase
        .from('payments')
        .select('lead_id, payment_type, amount')
        .eq('verification_status', 'verified')
        .limit(5000),
      supabase.from('campaign_entity_overrides').select('source_campaign, entity'),
    ])

    const overrides = new Map<string, Entity>(
      ((overridesRes.data || []) as Pick<CampaignEntityOverrideRow, 'source_campaign' | 'entity'>[]).map(
        (o) => [o.source_campaign, o.entity as Entity]
      )
    )
    setCampaignOverrides(overrides)

    const leadRows = (leadsRes.data || []) as LeadSummary[]
    setLeads(leadRows)

    const entityByLeadId = new Map<string, Entity>(
      leadRows.map((l) => [l.id, resolveEntity(l.source_campaign, overrides)])
    )

    let map = 0
    let seat = 0
    const byEntity: Record<Entity, { map: number; seat: number; total: number }> = emptyByEntity(() => ({
      map: 0,
      seat: 0,
      total: 0,
    }))
    ;((paymentsRes.data || []) as Pick<PaymentRow, 'lead_id' | 'payment_type' | 'amount'>[]).forEach((p) => {
      const amt = Number(p.amount) || 0
      const bucket = p.payment_type === 'pemetaan' || p.payment_type === 'roadmap_session' ? 'map'
        : p.payment_type === 'seat_lock' ? 'seat'
        : null
      if (!bucket) return
      if (bucket === 'map') map += amt
      else seat += amt
      // Skip entity attribution when the lead isn't in the current (possibly
      // trial-scoped) leadRows set — defaulting to HNZ here would silently
      // misattribute KFI revenue whenever a lead falls outside that scope.
      const entity = entityByLeadId.get(p.lead_id)
      if (!entity) return
      byEntity[entity][bucket] += amt
      byEntity[entity].total += amt
    })
    setRevenue({ map, seat, total: map + seat })
    setRevenueByEntity(byEntity)

    const now = Date.now()
    const nextStale = leadRows
      .filter((l) => (STAGE3_ATTENTION_STATUSES as readonly string[]).includes(l.current_status))
      .map((l) => {
        const last = l.last_contacted_date || l.updated_at || l.lead_entry_date
        const days = last ? Math.floor((now - new Date(last).getTime()) / 86400000) : 0
        return { id: l.id, name: l.full_name, status: l.current_status, days }
      })
      .filter((row) => row.days > STAGE3_ATTENTION_STALE_DAYS)
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

  const countsFor = useCallback((rows: LeadSummary[]) => {
    const stage1 = rows.filter(
      (l) => includes(STAGE1_CURRENT_STATUS_OPTIONS, l.current_status) || l.current_status === 'New Lead'
    ).length
    const stage2 = rows.filter((l) => includes(STAGE2_VISIBLE_STATUSES, l.current_status)).length
    // Cold Leads/Failed are part of STAGE3_STATUS_OPTIONS (Stage 3 kanban
    // has its own exit columns) but are also exit outcomes — exclude them
    // here so a lead isn't double-counted as both "in Stage 3" and "keluar".
    const stage3 = rows.filter(
      (l) => includes(STAGE3_STATUS_OPTIONS, l.current_status) && !isLostOutcomeStatus(l.current_status)
    ).length
    const won = rows.filter((l) => isStage3WonStatus(l.current_status)).length
    const exit = rows.filter((l) => isLostOutcomeStatus(l.current_status)).length
    const today = getTodayInWIB()
    const newToday = rows.filter((l) => (l.lead_entry_date || '').slice(0, 10) === today).length
    return { total: rows.length, stage1, stage2, stage3, won, exit, newToday }
  }, [])

  const counts = useMemo(() => {
    const byColumn = STAGE3_BOARD_COLUMNS.map((col) => ({
      key: col.key,
      label: col.label,
      color: col.color,
      soft: col.soft,
      count: leads.filter((l) => (col.statuses as readonly string[]).includes(l.current_status)).length,
    }))
    return { ...countsFor(leads), byColumn }
  }, [leads, countsFor])

  const entityCounts: Record<Entity, ReturnType<typeof countsFor>> = useMemo(() => {
    const leadsByEntity = emptyByEntity<LeadSummary[]>(() => [])
    for (const l of leads) {
      leadsByEntity[resolveEntity(l.source_campaign, campaignOverrides)].push(l)
    }
    return Object.fromEntries(
      ENTITIES.map((e) => [e, countsFor(leadsByEntity[e])])
    ) as Record<Entity, ReturnType<typeof countsFor>>
  }, [leads, countsFor, campaignOverrides])

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
      <Header title="Dashboard" subtitle="Pantau perkembangan lead, pembayaran, dan hal yang perlu segera ditindaklanjuti." />
      <div className="w-full p-6 space-y-6 font-sans">
        {/* Ringkasan utama */}
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

        {/* Per entitas: HNZ vs KFI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ENTITIES.map((entity) => {
            const ec = entityCounts[entity]
            const er = revenueByEntity[entity]
            return (
              <section key={entity} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-display text-sm font-semibold tracking-tight text-foreground">
                    {entity}
                  </h3>
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {loading ? '–' : ec.total} {isId ? 'total lead' : 'total leads'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground">Stage 1</p>
                    <p className="font-display text-lg font-semibold text-foreground tabular-nums">{loading ? '–' : ec.stage1}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground">Stage 2</p>
                    <p className="font-display text-lg font-semibold text-foreground tabular-nums">{loading ? '–' : ec.stage2}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground">Stage 3</p>
                    <p className="font-display text-lg font-semibold text-foreground tabular-nums">{loading ? '–' : ec.stage3}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground">Closing</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">{loading ? '–' : ec.won}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground">{isId ? 'Keluar' : 'Exited'}</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">{loading ? '–' : ec.exit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-medium text-muted-foreground">{isId ? 'Pendapatan' : 'Revenue'}</p>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {loading ? '–' : `Rp ${er.total.toLocaleString('id-ID')}`}
                    </p>
                  </div>
                </div>
              </section>
            )
          })}
        </div>

        {/* Alur perkembangan lead */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4">
            <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
              {isId ? 'Ringkasan perkembangan lead' : 'Lead progress overview'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {isId
                ? 'Posisi lead pada proses pemetaan, konsultasi, dan seat lock.'
                : 'Lead positions across mapping, consultation, and seat lock.'}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {counts.byColumn.map((col) => (
              <div key={col.key} className="rounded-xl border border-border px-3 py-2.5" style={{ background: col.soft, borderColor: col.color }}>
                <p className="min-h-7 text-[10px] font-semibold leading-snug" style={{ color: col.color }}>{col.label}</p>
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
                <h3 className="text-sm font-semibold text-foreground">{isId ? 'Butuh perhatian' : 'Needs attention'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isId ? 'Stage 3 yang belum disentuh lebih dari 3 hari.' : 'Stage 3 leads untouched for more than 3 days.'}
                </p>
              </div>
            </div>
            {loading ? (
              <div className="space-y-2">
                <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
              </div>
            ) : stalePreview.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {isId ? 'Tidak ada lead yang perlu ditindaklanjuti saat ini.' : 'No lead needs follow-up right now.'}
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {stalePreview.map((row) => (
                    <li key={row.id}>
                      <Link href={`/leads/${row.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 hover:bg-secondary/50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{row.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{row.status}</p>
                        </div>
                        <span className="text-xs font-semibold text-amber-600 tabular-nums flex-shrink-0">
                          {row.days} {isId ? 'hari' : 'days'}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link href="/stage-3" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:opacity-80">
                  {isId ? 'Buka Stage 3' : 'Open Stage 3'} <ArrowRight size={11} />
                </Link>
              </>
            )}
          </section>

          {/* Revenue */}
          <section className="rounded-2xl border border-dashed border-border bg-secondary/30 p-5">
            <div className="mb-4 flex items-center gap-2">
              <Wallet size={14} className="text-accent" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">{isId ? 'Pendapatan' : 'Revenue'}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isId ? 'Pembayaran yang sudah diverifikasi. Klik untuk melihat detail.' : 'Verified payments. Click to see details.'}
                </p>
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
              {isId ? 'Buka pembayaran' : 'View payments'} <ArrowRight size={11} />
            </Link>
          </section>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Clock size={12} />
          {isId ? 'Data mengikuti status lead terbaru. Klik kartu untuk melihat detail terkait.' : 'Data follows the latest lead status. Click a card to view details.'}
        </div>
      </div>
    </>
  )
}

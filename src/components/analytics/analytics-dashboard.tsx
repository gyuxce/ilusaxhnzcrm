'use client'

import { useMemo } from 'react'
import { Award, DollarSign, Target, TrendingUp, Users } from 'lucide-react'
import { FUNNEL_STAGES, countLeadsByFunnelStage, isWonStatus, isLostOutcomeStatus } from '@/lib/brand'
import { FunnelStageStrip } from '@/components/reports/funnel-stage-strip'
import { RankedStatList } from '@/components/reports/ranked-stat-list'
import { cn } from '@/lib/utils'

interface AnalyticsDashboardProps {
  allLeads: {
    source_campaign: string
    current_status: string
    lead_type: string
    lead_entry_date: string
    assigned_cro_id: string | null
    lost_reason: string | null
  }[]
  payments: {
    payment_type: string
    amount: number
    verification_status: string
    payment_date: string
  }[]
  users: { id: string; name: string }[]
}

export function AnalyticsDashboard({ allLeads, payments, users }: AnalyticsDashboardProps) {
  const stats = useMemo(() => {
    const total = allLeads.length
    const inbound = allLeads.filter((l) => l.lead_type === 'inbound').length
    const outbound = allLeads.filter((l) => l.lead_type === 'outbound').length
    const seatLockPaid = allLeads.filter((l) => isWonStatus(l.current_status)).length
    const lost = allLeads.filter((l) => isLostOutcomeStatus(l.current_status)).length
    const convRate = total > 0 ? ((seatLockPaid / total) * 100).toFixed(1) : '0.0'

    let revPemetaan = 0
    let revSeatLock = 0
    payments.forEach((p) => {
      if (p.payment_type === 'pemetaan' || p.payment_type === 'roadmap_session') {
        revPemetaan += Number(p.amount)
      } else if (p.payment_type === 'seat_lock') {
        revSeatLock += Number(p.amount)
      }
    })

    const bySource: Record<string, number> = {}
    allLeads.forEach((l) => {
      bySource[l.source_campaign] = (bySource[l.source_campaign] || 0) + 1
    })

    const lostReasons: Record<string, number> = {}
    allLeads
      .filter((l) => l.lost_reason)
      .forEach((l) => {
        lostReasons[l.lost_reason!] = (lostReasons[l.lost_reason!] || 0) + 1
      })

    const croLeaderboard: Record<string, number> = {}
    allLeads
      .filter((l) => isWonStatus(l.current_status))
      .forEach((l) => {
        if (l.assigned_cro_id) {
          croLeaderboard[l.assigned_cro_id] = (croLeaderboard[l.assigned_cro_id] || 0) + 1
        }
      })

    const monthlyLeads: Record<string, number> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
      monthlyLeads[key] = 0
    }
    allLeads.forEach((l) => {
      const d = new Date(l.lead_entry_date)
      const key = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
      if (monthlyLeads[key] !== undefined) monthlyLeads[key]++
    })

    return {
      total,
      inbound,
      outbound,
      seatLockPaid,
      lost,
      convRate,
      revPemetaan,
      revSeatLock,
      revTotal: revPemetaan + revSeatLock,
      bySource,
      lostReasons,
      croLeaderboard,
      monthlyLeads,
      stageCounts: countLeadsByFunnelStage(allLeads),
    }
  }, [allLeads, payments])

  const topSources = Object.entries(stats.bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
  const sourceTotal = topSources.reduce((sum, [, n]) => sum + n, 0) || 1
  const topReasons = Object.entries(stats.lostReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const reasonTotal = topReasons.reduce((sum, [, n]) => sum + n, 0) || 1
  const maxMonthly = Math.max(...Object.values(stats.monthlyLeads), 1)

  const croRanking = Object.entries(stats.croLeaderboard)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      name: users.find((u) => u.id === id)?.name || 'Unknown',
      count,
    }))

  const kpis = [
    { label: 'Total leads', value: String(stats.total), icon: Users },
    { label: 'Closing berhasil', value: String(stats.seatLockPaid), icon: Award },
    { label: 'Konversi', value: `${stats.convRate}%`, icon: Target },
    {
      label: 'Rev pemetaan',
      value: `Rp ${(stats.revPemetaan / 1e6).toFixed(1)}jt`,
      icon: DollarSign,
    },
    {
      label: 'Rev seat lock',
      value: `Rp ${(stats.revSeatLock / 1e6).toFixed(1)}jt`,
      icon: DollarSign,
    },
    {
      label: 'Total revenue',
      value: `Rp ${(stats.revTotal / 1e6).toFixed(1)}jt`,
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-6 font-sans">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[11px] font-semibold text-muted-foreground">{kpi.label}</span>
              <kpi.icon size={15} className="text-accent shrink-0" />
            </div>
            <p className="font-display text-2xl font-semibold tracking-tight text-foreground tabular-nums">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4">
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground">
            Tahap funnel 1–6
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Ringkas posisi lead — bukan daftar status detail yang panjang.
          </p>
        </div>
        <FunnelStageStrip
          counts={stats.stageCounts}
          hrefForStage={(id) => {
            const stage = FUNNEL_STAGES.find((s) => s.id === id)
            if (!stage) return '/pipeline'
            if (id === 6) return '/conversions?type=seat_lock'
            return `/leads?status=${encodeURIComponent(stage.statuses[0])}`
          }}
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground mb-1">
            Tren lead masuk
          </h3>
          <p className="text-xs text-muted-foreground mb-5">Enam bulan terakhir</p>
          <div className="flex items-end gap-2.5 h-36">
            {Object.entries(stats.monthlyLeads).map(([month, count]) => {
              const pct = (count / maxMonthly) * 100
              return (
                <div key={month} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                  <span className="text-[10px] font-semibold text-foreground tabular-nums">{count}</span>
                  <div
                    className="w-full max-w-[2.5rem] rounded-t-md bg-primary/85 transition-all"
                    style={{ height: `${Math.max(pct, count > 0 ? 8 : 2)}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{month}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground mb-1">
            Top campaign
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Sumber lead terbanyak</p>
          <RankedStatList
            empty="Belum ada data campaign."
            rows={topSources.map(([source, count]) => ({
              name: source || 'Tanpa campaign',
              count,
              percent: Math.round((count / sourceTotal) * 100),
              href: `/leads?campaign=${encodeURIComponent(source || '')}`,
            }))}
          />
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground mb-1">
            Peringkat CRO
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Closing berhasil (seat lock / onboarding)</p>
          <RankedStatList
            empty="Belum ada closing berhasil."
            valueSuffix=" SL"
            rows={croRanking.map((cro) => ({
              name: cro.name,
              count: cro.count,
            }))}
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display text-base font-semibold tracking-tight text-foreground mb-1">
            Alasan tidak lanjut
          </h3>
          <p className="text-xs text-muted-foreground mb-3">Dari field lost reason di lead</p>
          <RankedStatList
            empty="Belum ada alasan tercatat."
            rows={topReasons.map(([reason, count]) => ({
              name: reason,
              count,
              percent: Math.round((count / reasonTotal) * 100),
              href: '/playbook',
            }))}
          />
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-display text-base font-semibold tracking-tight text-foreground mb-4">
          Tipe lead
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground">Inbound</p>
            <p className="font-display text-3xl font-semibold tracking-tight tabular-nums mt-1">
              {stats.inbound}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground">Outbound</p>
            <p className="font-display text-3xl font-semibold tracking-tight tabular-nums mt-1">
              {stats.outbound}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground">Tidak lanjut (lost)</p>
            <p className="font-display text-3xl font-semibold tracking-tight tabular-nums mt-1">
              {stats.lost}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.lost / stats.total) * 100) : 0}% dari total
            </p>
          </div>
        </div>
        <p
          className={cn(
            'mt-3 text-[11px] text-muted-foreground',
            stats.total === 0 && 'opacity-60'
          )}
        >
          Inbound {stats.total ? Math.round((stats.inbound / stats.total) * 100) : 0}% · Outbound{' '}
          {stats.total ? Math.round((stats.outbound / stats.total) * 100) : 0}%
        </p>
      </section>
    </div>
  )
}

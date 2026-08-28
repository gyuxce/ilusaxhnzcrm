'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Loader2, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { ENTITIES, resolveEntity, type Entity } from '@/lib/entity'
import { useCampaignOverrides } from '@/lib/use-campaign-overrides'
import { countLeadFunnel } from '@/lib/lead-funnel-counts'
import { DANACITA_STATUS_OPTIONS } from '@/lib/danacita'
import type { DanacitaStatus } from '@/lib/supabase/types'

type PartnerChoice = Entity | 'DANACITA'

type LeadRow = {
  id: string
  current_status: string
  source_campaign: string
  lead_entry_date: string
}

type PaymentRow = {
  lead_id: string
  payment_type: string
  amount: number
  payment_date: string
  verification_status: string
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function inMonth(dateStr: string | null | undefined, ym: string) {
  return !!dateStr && dateStr.slice(0, 7) === ym
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatRp(value: number) {
  return `Rp${value.toLocaleString('id-ID')}`
}

function Delta({ current, previous, invertColor = false }: { current: number; previous: number; invertColor?: boolean }) {
  const diff = current - previous
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        <Minus size={12} /> Sama dengan bulan lalu ({previous})
      </span>
    )
  }
  const up = diff > 0
  const good = invertColor ? !up : up
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold', good ? 'text-emerald-600' : 'text-red-500')}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? 'Naik' : 'Turun'} {Math.abs(diff)} dari bulan lalu ({previous})
    </span>
  )
}

export default function LaporanBulananPage() {
  const supabase = createClient()
  const campaignOverrides = useCampaignOverrides()
  const [loading, setLoading] = useState(true)
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [danacitaApps, setDanacitaApps] = useState<{ id: string; status: DanacitaStatus; created_at: string }[]>([])
  const [month, setMonth] = useState(currentMonth())
  const [partner, setPartner] = useState<PartnerChoice>('HNZ')

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [leadsRes, paymentsRes, danacitaRes] = await Promise.all([
      supabase.from('leads').select('id, current_status, source_campaign, lead_entry_date').limit(5000),
      supabase.from('payments').select('lead_id, payment_type, amount, payment_date, verification_status').eq('verification_status', 'verified').limit(5000),
      supabase.from('danacita_applications').select('id, status, created_at').limit(2000),
    ])
    setLeads((leadsRes.data || []) as LeadRow[])
    setPayments((paymentsRes.data || []) as PaymentRow[])
    setDanacitaApps((danacitaRes.data || []) as { id: string; status: DanacitaStatus; created_at: string }[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const prevMonth = shiftMonth(month, -1)

  const entityLeads = useMemo(() => {
    if (partner === 'DANACITA') return []
    return leads.filter((l) => resolveEntity(l.source_campaign, campaignOverrides) === partner)
  }, [leads, partner, campaignOverrides])

  const entityLeadIds = useMemo(() => new Set(entityLeads.map((l) => l.id)), [entityLeads])

  const report = useMemo(() => {
    const buildForMonth = (ym: string) => {
      const newLeads = entityLeads.filter((l) => inMonth(l.lead_entry_date, ym)).length
      const monthPayments = payments.filter((p) => entityLeadIds.has(p.lead_id) && inMonth(p.payment_date, ym))
      const seatLockLeadIds = new Set(monthPayments.filter((p) => p.payment_type === 'seat_lock').map((p) => p.lead_id))
      const closing = seatLockLeadIds.size
      let map = 0
      let seat = 0
      monthPayments.forEach((p) => {
        const amt = Number(p.amount) || 0
        if (p.payment_type === 'pemetaan' || p.payment_type === 'roadmap_session') map += amt
        else if (p.payment_type === 'seat_lock') seat += amt
      })
      return { newLeads, closing, revenue: { map, seat, total: map + seat } }
    }
    return { current: buildForMonth(month), previous: buildForMonth(prevMonth) }
  }, [entityLeads, payments, entityLeadIds, month, prevMonth])

  const snapshot = useMemo(() => countLeadFunnel(entityLeads), [entityLeads])

  const danacitaReport = useMemo(() => {
    const buildForMonth = (ym: string) => {
      const monthApps = danacitaApps.filter((a) => inMonth(a.created_at, ym))
      const byStatus = Object.fromEntries(DANACITA_STATUS_OPTIONS.map((o) => [o.value, 0])) as Record<DanacitaStatus, number>
      monthApps.forEach((a) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1 })
      return { total: monthApps.length, byStatus }
    }
    return { current: buildForMonth(month), previous: buildForMonth(prevMonth) }
  }, [danacitaApps, month, prevMonth])

  const conversionRate = report.current.newLeads > 0 ? ((report.current.closing / report.current.newLeads) * 100).toFixed(1) : '0.0'

  return (
    <>
      <Header
        title="Laporan Bulanan"
        subtitle="Ringkasan performa bulanan untuk dibagikan ke partner (HNZ / KFI / Danacita)."
      />
      <div className="w-full p-6 space-y-5 font-sans">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            <button type="button" onClick={() => setMonth((m) => shiftMonth(m, -1))} className="rounded-lg p-1.5 hover:bg-secondary">
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[9rem] text-center text-xs font-semibold text-foreground capitalize">{monthLabel(month)}</span>
            <button type="button" onClick={() => setMonth((m) => shiftMonth(m, 1))} className="rounded-lg p-1.5 hover:bg-secondary">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
            {ENTITIES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setPartner(e)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                  partner === e ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary'
                )}
              >
                {e}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPartner('DANACITA')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                partner === 'DANACITA' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary'
              )}
            >
              Danacita
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            <div className="rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Laporan Bulanan · {partner === 'DANACITA' ? 'Danacita' : partner}</p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground capitalize mt-1">{monthLabel(month)}</h2>
            </div>

            {partner !== 'DANACITA' ? (
              <>
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-display text-sm font-semibold text-foreground mb-4">Ringkasan bulan ini</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Lead baru masuk</p>
                      <p className="font-display text-2xl font-semibold text-foreground tabular-nums">{report.current.newLeads}</p>
                      <Delta current={report.current.newLeads} previous={report.previous.newLeads} />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Berhasil closing</p>
                      <p className="font-display text-2xl font-semibold text-foreground tabular-nums">{report.current.closing}</p>
                      <Delta current={report.current.closing} previous={report.previous.closing} />
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Tingkat berhasil</p>
                      <p className="font-display text-2xl font-semibold text-foreground tabular-nums">{conversionRate}%</p>
                      <p className="text-[10px] text-muted-foreground">closing ÷ lead baru</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground">Total pendapatan</p>
                      <p className="font-display text-xl font-semibold text-foreground tabular-nums">{formatRp(report.current.revenue.total)}</p>
                      <Delta current={report.current.revenue.total} previous={report.previous.revenue.total} />
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-display text-sm font-semibold text-foreground mb-4">Pendapatan bulan ini</h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-secondary/30 px-3 py-3 text-center">
                      <p className="text-[11px] text-muted-foreground">Pemetaan</p>
                      <p className="text-sm font-semibold text-foreground tabular-nums mt-1">{formatRp(report.current.revenue.map)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-secondary/30 px-3 py-3 text-center">
                      <p className="text-[11px] text-muted-foreground">Seat Lock</p>
                      <p className="text-sm font-semibold text-foreground tabular-nums mt-1">{formatRp(report.current.revenue.seat)}</p>
                    </div>
                    <div className="rounded-xl border border-accent/30 bg-accent/5 px-3 py-3 text-center">
                      <p className="text-[11px] text-muted-foreground">Total</p>
                      <p className="text-sm font-semibold text-foreground tabular-nums mt-1">{formatRp(report.current.revenue.total)}</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-display text-sm font-semibold text-foreground mb-1">Posisi lead saat ini</h3>
                  <p className="text-[11px] text-muted-foreground mb-4">Total keseluruhan (bukan cuma bulan ini) — gambaran posisi lead {partner} sekarang.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="rounded-xl border border-border px-3 py-2.5">
                      <p className="text-[10px] text-muted-foreground">Baru masuk</p>
                      <p className="text-lg font-semibold text-foreground tabular-nums">{snapshot.stage1}</p>
                    </div>
                    <div className="rounded-xl border border-border px-3 py-2.5">
                      <p className="text-[10px] text-muted-foreground">Sedang diproses</p>
                      <p className="text-lg font-semibold text-foreground tabular-nums">{snapshot.stage2 + snapshot.stage3}</p>
                    </div>
                    <div className="rounded-xl border border-border px-3 py-2.5">
                      <p className="text-[10px] text-muted-foreground">Berhasil (total)</p>
                      <p className="text-lg font-semibold text-foreground tabular-nums">{snapshot.won}</p>
                    </div>
                    <div className="rounded-xl border border-border px-3 py-2.5">
                      <p className="text-[10px] text-muted-foreground">Tidak lanjut</p>
                      <p className="text-lg font-semibold text-foreground tabular-nums">{snapshot.exit}</p>
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <>
                <section className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-display text-sm font-semibold text-foreground mb-4">Pengajuan bulan ini</h3>
                  <div className="text-center mb-4">
                    <p className="text-[11px] text-muted-foreground">Total pengajuan</p>
                    <p className="font-display text-3xl font-semibold text-foreground tabular-nums">{danacitaReport.current.total}</p>
                    <Delta current={danacitaReport.current.total} previous={danacitaReport.previous.total} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    {DANACITA_STATUS_OPTIONS.map((opt) => (
                      <div key={opt.value} className="rounded-xl border border-border px-3 py-2.5">
                        <p className="text-[10px] text-muted-foreground">{opt.label}</p>
                        <p className="text-lg font-semibold text-foreground tabular-nums">{danacitaReport.current.byStatus[opt.value]}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}

            <p className="text-center text-[10px] text-muted-foreground">
              Laporan ini dibuat otomatis dari data CRM Harunokaze — screenshot atau salin halaman ini untuk dibagikan.
            </p>
          </div>
        )}
      </div>
    </>
  )
}

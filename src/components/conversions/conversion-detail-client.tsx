'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, CreditCard, DollarSign, ReceiptText } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PaymentWithLead = {
  id: string
  lead_id: string
  payment_type: string
  amount: number
  payment_method: string
  payment_date: string
  verification_status: string
  notes: string | null
  created_at: string
  leads: {
    id: string
    full_name: string
    whatsapp_number: string
    source_campaign: string
  } | null
}

const PAYMENT_TYPE_LABEL: Record<string, string> = {
  pemetaan: 'Pemetaan',
  roadmap_session: 'Pemetaan',
  seat_lock: 'Seat Lock',
}

function rupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`
}

function paymentLabel(type: string) {
  return PAYMENT_TYPE_LABEL[type] || type.replaceAll('_', ' ')
}

function isPemetaan(type: string) {
  return type === 'pemetaan' || type === 'roadmap_session'
}

type FilterType = 'all' | 'pemetaan' | 'seat_lock'

export function ConversionDetailClient({
  payments,
  initialType = 'all',
}: {
  payments: PaymentWithLead[]
  initialType?: string
}) {
  const [selectedType, setSelectedType] = useState<FilterType>(
    initialType === 'pemetaan' || initialType === 'seat_lock' ? initialType : 'all'
  )

  const revenuePemetaan = useMemo(() => (
    payments
      .filter(payment => isPemetaan(payment.payment_type))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  ), [payments])

  const revenueSeatLock = useMemo(() => (
    payments
      .filter(payment => payment.payment_type === 'seat_lock')
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  ), [payments])

  const totalRevenue = revenuePemetaan + revenueSeatLock

  const visiblePayments = useMemo(() => {
    if (selectedType === 'pemetaan') return payments.filter(payment => isPemetaan(payment.payment_type))
    if (selectedType === 'seat_lock') return payments.filter(payment => payment.payment_type === 'seat_lock')
    return payments
  }, [payments, selectedType])

  const filters = [
    { key: 'all' as const, label: 'Semua', count: payments.length },
    { key: 'pemetaan' as const, label: 'Pemetaan', count: payments.filter(payment => isPemetaan(payment.payment_type)).length },
    { key: 'seat_lock' as const, label: 'Seat Lock', count: payments.filter(payment => payment.payment_type === 'seat_lock').length },
  ]

  const setFilter = (type: FilterType) => {
    setSelectedType(type)
    const url = type === 'all' ? '/conversions' : `/conversions?type=${type}`
    window.history.replaceState(null, '', url)
  }

  return (
    <div className="w-full p-6 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Revenue Pemetaan', value: rupiah(revenuePemetaan), icon: ReceiptText, tone: 'text-purple-600 bg-purple-500/10' },
          { label: 'Revenue Seat Lock', value: rupiah(revenueSeatLock), icon: CreditCard, tone: 'text-emerald-600 bg-emerald-500/10' },
          { label: 'Total Revenue', value: rupiah(totalRevenue), icon: DollarSign, tone: 'text-blue-600 bg-blue-500/10' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-muted-foreground">{card.label}</span>
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${card.tone}`}>
                <card.icon size={17} />
              </div>
            </div>
            <p className="mt-5 text-2xl font-black text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 px-5 py-4 text-sm text-blue-950 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100">
        Halaman ini menampilkan detail dari angka revenue di dashboard. Yang dihitung hanya pembayaran dengan status <b>verified</b>.
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map(filter => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setFilter(filter.key)}
              className={cn(
                'rounded-full border px-4 py-2 text-xs font-bold transition-colors active:scale-[0.98]',
                selectedType === filter.key
                  ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/30 dark:text-purple-300'
                  : 'border-border text-muted-foreground hover:bg-muted'
              )}
            >
              {filter.label}
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground">{filter.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Rincian Pembayaran</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {visiblePayments.length} transaksi verified ditampilkan.
            </p>
          </div>
          <CheckCircle2 size={18} className="text-emerald-500" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3">Lead</th>
                <th className="px-5 py-3">Tipe</th>
                <th className="px-5 py-3">Tanggal Bayar</th>
                <th className="px-5 py-3 text-right">Nominal</th>
                <th className="px-5 py-3">Metode</th>
                <th className="px-5 py-3">Campaign</th>
                <th className="px-5 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visiblePayments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Belum ada pembayaran verified untuk filter ini.
                  </td>
                </tr>
              ) : visiblePayments.map(payment => (
                <tr key={payment.id} className="border-b border-border/70 last:border-b-0">
                  <td className="px-5 py-4">
                    <p className="font-bold text-foreground">{payment.leads?.full_name || 'Lead tidak ditemukan'}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{payment.leads?.whatsapp_number || '-'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 dark:border-purple-900 dark:bg-purple-950/30 dark:text-purple-300">
                      {paymentLabel(payment.payment_type)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{payment.payment_date}</td>
                  <td className="px-5 py-4 text-right font-black text-emerald-600 dark:text-emerald-300">
                    {rupiah(payment.amount)}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{payment.payment_method || '-'}</td>
                  <td className="px-5 py-4 text-muted-foreground">{payment.leads?.source_campaign || '-'}</td>
                  <td className="px-5 py-4">
                    {payment.leads?.id ? (
                      <Link
                        href={`/leads/${payment.leads.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
                      >
                        Detail Lead
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

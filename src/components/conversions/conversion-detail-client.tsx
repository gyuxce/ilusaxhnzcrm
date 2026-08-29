'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CreditCard, DollarSign, Download, ReceiptText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { paymentChannelLabel } from '@/lib/payment-channel'

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

  const revenuePemetaan = useMemo(
    () =>
      payments
        .filter((payment) => isPemetaan(payment.payment_type) && payment.verification_status === 'verified')
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [payments]
  )

  const revenueSeatLock = useMemo(
    () =>
      payments
        .filter((payment) => payment.payment_type === 'seat_lock' && payment.verification_status === 'verified')
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [payments]
  )

  const totalRevenue = revenuePemetaan + revenueSeatLock

  const visiblePayments = useMemo(() => {
    if (selectedType === 'pemetaan') return payments.filter((payment) => isPemetaan(payment.payment_type))
    if (selectedType === 'seat_lock') return payments.filter((payment) => payment.payment_type === 'seat_lock')
    return payments
  }, [payments, selectedType])

  const filters = [
    { key: 'all' as const, label: 'Semua', count: payments.length },
    {
      key: 'pemetaan' as const,
      label: 'Pemetaan',
      count: payments.filter((payment) => isPemetaan(payment.payment_type)).length,
    },
    {
      key: 'seat_lock' as const,
      label: 'Seat Lock',
      count: payments.filter((payment) => payment.payment_type === 'seat_lock').length,
    },
  ]

  const setFilter = (type: FilterType) => {
    setSelectedType(type)
    const url = type === 'all' ? '/conversions' : `/conversions?type=${type}`
    window.history.replaceState(null, '', url)
  }

  const exportCsv = () => {
    const rows = visiblePayments.map((payment) => ({
      tanggal: payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('id-ID') : '',
      nama_lead: payment.leads?.full_name || '',
      whatsapp: payment.leads?.whatsapp_number || '',
      campaign: payment.leads?.source_campaign || '',
      tipe_pembayaran: paymentLabel(payment.payment_type),
      nominal: Number(payment.amount || 0),
      metode: payment.payment_method ? paymentChannelLabel(payment.payment_method) : '',
      status_verifikasi: payment.verification_status,
      catatan: payment.notes || '',
    }))
    const headers = ['tanggal', 'nama_lead', 'whatsapp', 'campaign', 'tipe_pembayaran', 'nominal', 'metode', 'status_verifikasi', 'catatan']
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => escapeCsv(row[header as keyof typeof row])).join(',')),
    ].join('\n')

    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `pembayaran-${selectedType}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="w-full p-6 space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            label: 'Revenue Pemetaan',
            value: rupiah(revenuePemetaan),
            icon: ReceiptText,
            tone: 'text-primary bg-secondary',
          },
          {
            label: 'Revenue Seat Lock',
            value: rupiah(revenueSeatLock),
            icon: CreditCard,
            tone: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10',
          },
          {
            label: 'Total Revenue',
            value: rupiah(totalRevenue),
            icon: DollarSign,
            tone: 'text-accent bg-accent/10',
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-muted-foreground">{card.label}</span>
              <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${card.tone}`}>
                <card.icon size={17} />
              </div>
            </div>
            <p className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground tabular-nums">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-secondary/50 px-5 py-4 text-sm text-foreground/80">
        Semua pembayaran yang dicatat tampil di sini. Angka revenue hanya menghitung pembayaran dengan status{' '}
        <span className="font-semibold text-foreground">verified</span>.
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setFilter(filter.key)}
              className={cn(
                'rounded-xl border px-4 py-2 text-xs font-semibold transition-colors',
                selectedType === filter.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
              )}
            >
              {filter.label}
              <span
                className={cn(
                  'ml-2 rounded-md px-2 py-0.5 text-[10px]',
                  selectedType === filter.key
                    ? 'bg-primary-foreground/15 text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
              >
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
              Rincian Pembayaran
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {visiblePayments.length} transaksi ditampilkan.
            </p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={visiblePayments.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-secondary/70 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-semibold">Lead</th>
                <th className="px-5 py-3 font-semibold">Tipe</th>
                <th className="px-5 py-3 font-semibold">Tanggal Bayar</th>
                <th className="px-5 py-3 text-right font-semibold">Nominal</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Metode</th>
                <th className="px-5 py-3 font-semibold">Campaign</th>
                <th className="px-5 py-3 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visiblePayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    Belum ada pembayaran untuk filter ini.
                  </td>
                </tr>
              ) : (
                visiblePayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border/70 last:border-b-0 hover:bg-secondary/30">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-foreground">
                        {payment.leads?.full_name || 'Lead tidak ditemukan'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground font-mono">
                        {payment.leads?.whatsapp_number || '-'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          'rounded-md border px-2.5 py-1 text-xs font-semibold',
                          isPemetaan(payment.payment_type)
                            ? 'border-border bg-secondary text-foreground'
                            : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        )}
                      >
                        {paymentLabel(payment.payment_type)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{payment.payment_date}</td>
                    <td className="px-5 py-4 text-right font-semibold tabular-nums text-foreground">
                      {rupiah(payment.amount)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        'rounded-md border px-2.5 py-1 text-xs font-semibold',
                        payment.verification_status === 'verified'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      )}>
                        {payment.verification_status === 'verified' ? 'Terverifikasi' : payment.verification_status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{payment.payment_method ? paymentChannelLabel(payment.payment_method) : '-'}</td>
                    <td className="px-5 py-4 text-muted-foreground">{payment.leads?.source_campaign || '-'}</td>
                    <td className="px-5 py-4">
                      {payment.leads?.id ? (
                        <Link
                          href={`/leads/${payment.leads.id}`}
                          className="inline-flex items-center justify-center rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
                        >
                          Detail Lead
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

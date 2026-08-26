'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { revalidateLeadsListing } from '@/app/actions/revalidate-leads'
import { createClient } from '@/lib/supabase/client'
import { cn, getTodayInWIB } from '@/lib/utils'
import { getStageBadgeClasses } from '@/lib/brand'
import {
  STAGE2_KERJAKAN_STATUS_OPTIONS,
  STAGE2_VISIBLE_STATUSES,
} from '@/lib/prd-stages'
import { readPrdTrialSinceClient, PRD_TRIAL_MODE_CHANGED } from '@/lib/prd-trial-mode'
import { useCampaignOverrides } from '@/lib/use-campaign-overrides'
import { EntityBadge } from '@/components/leads/entity-badge'
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Search,
  X,
} from 'lucide-react'

type LeadRow = {
  id: string
  full_name: string
  whatsapp_number: string
  source_campaign: string
  current_status: string
  lead_entry_date: string
  last_contacted_date: string | null
  payments?: {
    id: string
    payment_type: string
    amount: number
    payment_method: string
    payment_date: string
    verification_status: string
    notes: string | null
  }[]
  users?: { id?: string; name?: string } | null
}

const FILTERS = [
  { key: 'all', label: 'Semua' },
  ...STAGE2_VISIBLE_STATUSES.map((s) => ({ key: s, label: s })),
] as const

type Form = {
  statusStaging: string
  nominalPemetaan: string
  komunikasiTerakhir: string
  note: string
}

function toDateTimeInputValue(value?: string | null) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toTimestamp(value?: string | null) {
  if (!value) return new Date().toISOString()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function mappingPayment(lead: LeadRow) {
  return (lead.payments || []).find((payment) => payment.payment_type === 'pemetaan' || payment.payment_type === 'roadmap_session') || null
}

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`
}

export default function Stage2Page() {
  const router = useRouter()
  const supabase = createClient()
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [activeLead, setActiveLead] = useState<LeadRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })
  const campaignOverrides = useCampaignOverrides()
  const [form, setForm] = useState<Form>({
    statusStaging: '',
    nominalPemetaan: '',
    komunikasiTerakhir: '',
    note: '',
  })

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const trialSince = readPrdTrialSinceClient()
    let q = supabase
      .from('leads')
      .select('id, full_name, whatsapp_number, source_campaign, current_status, lead_entry_date, last_contacted_date, payments(id, payment_type, amount, payment_method, payment_date, verification_status, notes), users:assigned_cro_id(id, name)')
      .in('current_status', STAGE2_VISIBLE_STATUSES as unknown as string[])
      .order('updated_at', { ascending: false })
      .limit(1000)
    if (trialSince) {
      q = q.gte('created_at', trialSince)
    }
    const { data, error } = await q
    if (error) {
      setMessage({ type: 'error', text: error.message })
      setLeads([])
    } else {
      setLeads(data as LeadRow[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void fetchLeads()
    const onTrialChange = () => void fetchLeads()
    window.addEventListener(PRD_TRIAL_MODE_CHANGED, onTrialChange)
    return () => window.removeEventListener(PRD_TRIAL_MODE_CHANGED, onTrialChange)
  }, [fetchLeads])

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: leads.length }
    for (const s of STAGE2_VISIBLE_STATUSES) map[s] = 0
    leads.forEach((l) => {
      if (map[l.current_status] !== undefined) map[l.current_status]++
    })
    return map
  }, [leads])

  const filtered = useMemo(() => {
    const k = query.trim().toLowerCase()
    return leads
      .filter((l) => (filter === 'all' ? true : l.current_status === filter))
      .filter((l) =>
        !k
          ? true
          : [l.full_name, l.whatsapp_number, l.source_campaign, l.current_status].some((v) =>
              String(v || '').toLowerCase().includes(k)
            )
      )
  }, [leads, query, filter])

  function openFlow(lead: LeadRow) {
    const existingPayment = mappingPayment(lead)
    setActiveLead(lead)
    setMessage({ type: '', text: '' })
    setForm({
      statusStaging: '',
      nominalPemetaan: existingPayment ? String(Number(existingPayment.amount || 0)) : '',
      komunikasiTerakhir: toDateTimeInputValue(lead.last_contacted_date),
      note: '',
    })
  }

  const isLainnya = form.statusStaging === 'Lainnya (tulis di note)'

  function canSave() {
    if (!activeLead) return false
    if (!form.statusStaging) return false
    if (isLainnya && !form.note.trim()) return false
    return true
  }

  async function handleSave() {
    if (!activeLead || saving || !canSave()) return
    setSaving(true)
    setMessage({ type: '', text: '' })

    const nextStatus = isLainnya ? activeLead.current_status : form.statusStaging
    const funnelParts: string[] = []
    if (isLainnya) funnelParts.push(`Lainnya: ${form.note.trim()}`)
    else if (form.note.trim()) funnelParts.push(`Note: ${form.note.trim()}`)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const existingPayment = mappingPayment(activeLead)
    if (form.nominalPemetaan.trim()) {
      const nominal = Number(form.nominalPemetaan.replace(/[^\d]/g, ''))
      if (!Number.isNaN(nominal) && nominal > 0) {
        const paymentPayload = {
          lead_id: activeLead.id,
          // Preserve a legacy 'roadmap_session' row's type on update instead
          // of silently collapsing it back to 'pemetaan'.
          payment_type: existingPayment?.payment_type || 'pemetaan',
          amount: nominal,
          payment_method: existingPayment?.payment_method || 'Transfer',
          payment_date: existingPayment?.payment_date || getTodayInWIB(),
          verification_status: existingPayment?.verification_status || 'verified',
          verified_by: user?.id ?? null,
          verified_at: new Date().toISOString(),
          notes: existingPayment?.notes || 'Input dari Stage 2',
          updated_at: new Date().toISOString(),
        }
        const paymentResult = existingPayment
          ? await supabase.from('payments').update(paymentPayload).eq('id', existingPayment.id)
          : await supabase.from('payments').insert(paymentPayload)
        if (paymentResult.error) {
          setSaving(false)
          setMessage({ type: 'error', text: `Gagal menyimpan pembayaran: ${paymentResult.error.message}` })
          return
        }
      }
    }

    const { error } = await supabase
      .from('leads')
      .update({
        current_status: nextStatus,
        funnel_notes: funnelParts.join(' | ') || null,
        last_contacted_date: toTimestamp(form.komunikasiTerakhir),
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeLead.id)

    if (error) {
      setSaving(false)
      setMessage({ type: 'error', text: `Gagal menyimpan: ${error.message}` })
      return
    }

    await supabase.from('lead_activities').insert({
      lead_id: activeLead.id,
      activity_type: 'Stage 2',
      description: `Stage 2 -> ${nextStatus}`,
      created_by: user?.id ?? null,
    })

    await revalidateLeadsListing()
    setSaving(false)
    setMessage({ type: 'success', text: `Tersimpan. Status sekarang: ${nextStatus}.` })
    setLeads((prev) => prev.filter((lead) => lead.id !== activeLead.id))
    setActiveLead(null)
    router.refresh()
    void fetchLeads()
  }

  return (
    <>
      <Header
        title="Stage 2"
        subtitle="Lead interested: jadwalkan pemetaan, expert, atau seat-lock."
      />
      <div className="p-5 sm:p-6 animate-fade-in w-full font-sans">
        <div className="glass-card rounded-2xl border border-border overflow-hidden">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-1.5 border-b border-border p-3">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-semibold transition-colors',
                  filter === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label} {counts[f.key] ?? 0}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center justify-between gap-2 p-3">
            <div className="relative max-w-sm flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama / WA / campaign..."
                className="w-full rounded-lg border border-border bg-card py-1.5 pl-8 pr-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">{filtered.length} lead</p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-y border-border bg-secondary/40">
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">Nama</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">Nomor WhatsApp</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">Current Staging</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">Edit</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground">Kerjakan Stage 2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      <Loader2 size={16} className="inline animate-spin" /> Memuat...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground/40 text-sm">
                      Belum ada lead di Stage 2.
                    </td>
                  </tr>
                ) : (
                  filtered.map((lead) => (
                    <tr key={lead.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-2.5 min-w-[10rem] max-w-[16rem]">
                        <Link href={`/leads/${lead.id}`} className="block truncate text-[12px] font-semibold text-foreground hover:text-accent">
                          {lead.full_name}
                        </Link>
                        <p className="mt-0.5 flex min-w-0 items-center gap-1.5">
                          <span className="min-w-0 truncate text-[10px] text-muted-foreground">{lead.source_campaign}</span>
                          <EntityBadge sourceCampaign={lead.source_campaign} overrides={campaignOverrides} />
                        </p>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">{lead.whatsapp_number}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={cn('px-1.5 py-0.5 rounded-md text-[10px] font-semibold', getStageBadgeClasses(lead.current_status))}>
                          {lead.current_status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <Link
                          href={`/leads/${lead.id}/edit`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openFlow(lead)}
                          className="rounded-lg bg-accent px-3 py-1.5 text-[11px] font-semibold text-accent-foreground hover:opacity-90"
                        >
                          Kerjakan
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Kerjakan Stage 2 modal, portal ke body agar center. */}
      {activeLead &&
        createPortal(
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(27,42,74,0.45)' }}>
            <div className="h-full w-full overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4">
                <div
                  role="dialog"
                  aria-modal="true"
                  className="flex w-full max-w-lg max-h-[min(36rem,calc(100vh-2rem))] flex-col rounded-2xl border border-border bg-card shadow-xl"
                >
                  <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-base font-semibold text-foreground">Kerjakan Stage 2</h3>
                      <p className="truncate text-[11px] text-muted-foreground">{activeLead.full_name} - {activeLead.whatsapp_number}</p>
                    </div>
                    <button type="button" onClick={() => setActiveLead(null)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary">
                      <X size={16} />
                    </button>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {message.text && (
                      <div className={cn('mb-3 rounded-lg border px-3 py-2 text-[11px] font-medium', message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-destructive/20 bg-destructive/5 text-destructive')}>
                        {message.text}
                      </div>
                    )}
                    <div className="grid grid-cols-1 gap-3">
                      <Field label="Status Current Staging">
                        <select
                          value={form.statusStaging}
                          onChange={(e) => setForm((prev) => ({ ...prev, statusStaging: e.target.value }))}
                          className="field-input"
                        >
                          <option value="">Pilih status...</option>
                          {STAGE2_KERJAKAN_STATUS_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </Field>

                      <Field label={mappingPayment(activeLead) ? `Pembayaran pemetaan tercatat: ${formatRupiah(mappingPayment(activeLead)?.amount || 0)} (${mappingPayment(activeLead)?.verification_status})` : 'Pemetaan belum tercatat'}>
                        <input
                          inputMode="numeric"
                          value={form.nominalPemetaan}
                          onChange={(e) => setForm((prev) => ({ ...prev, nominalPemetaan: e.target.value.replace(/[^\d]/g, '') }))}
                          placeholder="Isi nominal jika sudah bayar"
                          className="field-input"
                        />
                      </Field>

                      <Field label="Komunikasi Terakhir">
                        <input
                          type="datetime-local"
                          value={form.komunikasiTerakhir}
                          onChange={(e) => setForm((prev) => ({ ...prev, komunikasiTerakhir: e.target.value }))}
                          className="field-input"
                        />
                      </Field>

                      <Field label="Note (opsional)">
                        <textarea
                          value={form.note}
                          onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                          className="field-input min-h-[56px] resize-y"
                          placeholder={isLainnya ? 'Tulis status lainnya di sini...' : 'Opsional'}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-secondary/30 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setActiveLead(null)}
                      className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={saving || !canSave()}
                      onClick={handleSave}
                      className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                      Simpan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-[11px] font-semibold text-foreground/80">{label}</span>
      {children}
    </label>
  )
}

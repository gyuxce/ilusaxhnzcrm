'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { WhatsAppButton } from '@/components/leads/WhatsAppButton'
import { createClient } from '@/lib/supabase/client'
import { cn, getTodayInWIB } from '@/lib/utils'
import { getStageBadgeClasses } from '@/lib/brand'
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Search,
} from 'lucide-react'
import {
  STAGE1_CURRENT_STATUS_OPTIONS,
  STAGE1_HASIL_FOLLOWUP_OPTIONS,
  STAGE1_AKSI_TRIGGER,
  STAGE1_AKSI_CRO_OPTIONS,
  STAGE1_ALASAN_PENOLAKAN_OPTIONS,
} from '@/lib/prd-stages'
import { readPrdTrialSinceClient, PRD_TRIAL_MODE_CHANGED } from '@/lib/prd-trial-mode'

type LeadRow = {
  id: string
  full_name: string
  whatsapp_number: string
  source_campaign: string
  current_status: string
  lead_entry_date: string
  users?: { id?: string; name?: string } | null
}

type Form = {
  currentStatus: string
  hasilFollowUp: string
  notEligibleNote: string
  aksiCro: string
  alasanPenolakan: string
  note: string
}

export default function Stage1Page() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const leadIdParam = searchParams.get('lead')

  const [leads, setLeads] = useState<LeadRow[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(leadIdParam)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })

  const [form, setForm] = useState<Form>({
    currentStatus: 'Bridging',
    hasilFollowUp: '',
    notEligibleNote: '',
    aksiCro: '',
    alasanPenolakan: '',
    note: '',
  })

  async function fetchLeads() {
    setLoading(true)
    const trialSince = readPrdTrialSinceClient()
    let q = supabase
      .from('leads')
      .select('id, full_name, whatsapp_number, source_campaign, current_status, lead_entry_date, users:assigned_cro_id(id, name)')
      .in('current_status', ['Input Manual', 'New Lead', 'Bridging', 'Pitching'])
      .order('lead_entry_date', { ascending: false })
      .limit(400)
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
  }

  useEffect(() => {
    void fetchLeads()
    const onTrialChange = () => void fetchLeads()
    window.addEventListener(PRD_TRIAL_MODE_CHANGED, onTrialChange)
    return () => window.removeEventListener(PRD_TRIAL_MODE_CHANGED, onTrialChange)
  }, [])

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedId) || null,
    [leads, selectedId]
  )

  // If deep-linked with ?lead= but that lead isn't in the default list, fetch it.
  useEffect(() => {
    if (!leadIdParam) return
    if (selectedLead) {
      setForm((prev) => ({
        ...prev,
        currentStatus:
          selectedLead.current_status === 'Pitching' ? 'Pitching' : 'Bridging',
      }))
      return
    }
    let active = true
    ;(async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, full_name, whatsapp_number, source_campaign, current_status, lead_entry_date, users:assigned_cro_id(id, name)')
        .eq('id', leadIdParam)
        .maybeSingle()
      if (active && data) {
        setLeads((prev) => [data as LeadRow, ...prev.filter((l) => l.id !== data.id)])
        setForm((prev) => ({
          ...prev,
          currentStatus: (data as LeadRow).current_status === 'Pitching' ? 'Pitching' : 'Bridging',
        }))
      }
    })()
    return () => {
      active = false
    }
  }, [leadIdParam, selectedLead, supabase])

  const filtered = useMemo(() => {
    const k = query.trim().toLowerCase()
    if (!k) return leads
    return leads.filter((l) =>
      [l.full_name, l.whatsapp_number, l.source_campaign, l.current_status]
        .some((v) => String(v || '').toLowerCase().includes(k))
    )
  }, [leads, query])

  const isPitching = form.currentStatus === 'Pitching'
  const showAksi = STAGE1_AKSI_TRIGGER.includes(form.hasilFollowUp as never)
  const showAlasan = form.hasilFollowUp === 'Not Interested'
  const isNotEligible = form.hasilFollowUp === 'Not Eligible'

  const canSave = () => {
    if (!selectedLead) return false
    if (!form.currentStatus) return false
    if (isPitching && !form.hasilFollowUp) return false
    if (isNotEligible && !form.notEligibleNote.trim()) return false
    if (showAlasan && !form.alasanPenolakan) return false
    return true
  }

  function chooseLead(id: string) {
    setSelectedId(id)
    setMessage({ type: '', text: '' })
    const lead = leads.find((l) => l.id === id)
    setForm({
      currentStatus: lead?.current_status === 'Pitching' ? 'Pitching' : 'Bridging',
      hasilFollowUp: '',
      notEligibleNote: '',
      aksiCro: '',
      alasanPenolakan: '',
      note: '',
    })
  }

  async function handleSave() {
    if (!selectedLead || saving || !canSave()) return
    setSaving(true)
    setMessage({ type: '', text: '' })

    let nextStatus = form.currentStatus
    if (isPitching) {
      nextStatus = isNotEligible ? 'Not Eligible' : form.hasilFollowUp
    }

    const funnelParts: string[] = []
    if (form.aksiCro) funnelParts.push(`Aksi CRO: ${form.aksiCro}`)
    if (isNotEligible && form.notEligibleNote.trim()) funnelParts.push(`Not Eligible: ${form.notEligibleNote.trim()}`)
    if (form.note.trim()) funnelParts.push(`Note: ${form.note.trim()}`)
    const funnelNotes = funnelParts.join(' · ') || null

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('leads')
      .update({
        current_status: nextStatus,
        lost_reason: showAlasan ? form.alasanPenolakan : null,
        funnel_notes: funnelNotes,
        last_contacted_date: getTodayInWIB(),
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', selectedLead.id)

    if (error) {
      setSaving(false)
      setMessage({ type: 'error', text: `Gagal menyimpan: ${error.message}` })
      return
    }

    await supabase.from('lead_activities').insert({
      lead_id: selectedLead.id,
      activity_type: 'Stage 1',
      description: `Stage 1 → ${nextStatus}${showAlasan ? ` (${form.alasanPenolakan})` : ''}`,
      created_by: user?.id ?? null,
    })

    setSaving(false)
    setMessage({ type: 'success', text: `Tersimpan. Status sekarang: ${nextStatus}.` })
    void fetchLeads()
  }

  return (
    <>
      <Header
        title="Kerjakan · Stage 1"
        subtitle="Update Current Status & hasil follow-up. Bridging bisa langsung simpan."
      />
      <div className="w-full px-3 py-3 sm:px-4 font-sans">
        <div className="mb-2 flex items-center justify-between">
          <Link
            href="/leads"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={14} /> Kembali ke Leads
          </Link>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[17.5rem_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl border border-border bg-card xl:h-[calc(100vh-11rem)]">
          {/* Lead picker */}
          <aside className="flex flex-col border-b xl:border-b-0 xl:border-r border-border bg-primary/[0.04] min-h-[14rem] xl:min-h-0">
            <div className="shrink-0 space-y-2 border-b border-border/80 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Pilih lead
              </p>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Cari nama / WA..."
                  className="w-full rounded-lg border border-border bg-card py-1.5 pl-8 pr-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" /> Memuat...
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">Tidak ada lead.</p>
              ) : (
                filtered.map((lead) => {
                  const active = selectedId === lead.id
                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => chooseLead(lead.id)}
                      className={cn(
                        'w-full rounded-lg border px-2.5 py-2 text-left transition-colors',
                        active
                          ? 'border-accent bg-accent/10 shadow-sm'
                          : 'border-transparent bg-card/70 hover:border-border hover:bg-card'
                      )}
                    >
                      <p className="truncate text-xs font-semibold text-foreground">{lead.full_name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{lead.source_campaign}</p>
                      <span className={cn('mt-1 inline-block rounded px-1.5 py-0.5 text-[9px]', getStageBadgeClasses(lead.current_status))}>
                        {lead.current_status}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          {/* Form */}
          <main className="flex min-h-0 flex-col bg-card">
            {!selectedLead ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <p className="text-sm font-medium">Pilih lead dari daftar</p>
              </div>
            ) : (
              <>
                <div className="shrink-0 space-y-2 border-b border-border px-3 py-2.5 sm:px-4">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-lg font-semibold tracking-tight text-foreground">
                        {selectedLead.full_name}
                      </h2>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {selectedLead.whatsapp_number} · {selectedLead.source_campaign}
                      </p>
                    </div>
                    <WhatsAppButton
                      leadName={selectedLead.full_name}
                      leadPhone={selectedLead.whatsapp_number}
                      leadId={selectedLead.id}
                      picName={selectedLead.users?.name}
                      iconOnly
                    />
                  </div>
                  {message.text && (
                    <div
                      className={cn(
                        'rounded-lg border px-2.5 py-1.5 text-[11px] font-medium',
                        message.type === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-destructive/20 bg-destructive/5 text-destructive'
                      )}
                    >
                      {message.text}
                    </div>
                  )}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Field label="Update Current Status" className="sm:col-span-2">
                      <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-0.5">
                        {STAGE1_CURRENT_STATUS_OPTIONS.filter((s) => s !== 'Input Manual').map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                currentStatus: opt,
                                hasilFollowUp: '',
                                aksiCro: '',
                                alasanPenolakan: '',
                                notEligibleNote: '',
                              }))
                            }
                            className={cn(
                              'rounded-md px-3 py-1 text-[11px] font-semibold transition-colors',
                              form.currentStatus === opt
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1.5 text-[10px] text-muted-foreground">
                        Bridging → bisa langsung simpan. Pitching → pilih hasil follow-up.
                      </p>
                    </Field>

                    {isPitching && (
                      <>
                        <Field label="Hasil Follow-up" className="sm:col-span-2">
                          <select
                            value={form.hasilFollowUp}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                hasilFollowUp: e.target.value,
                                aksiCro: '',
                                alasanPenolakan: '',
                                notEligibleNote: '',
                              }))
                            }
                            className="field-input"
                          >
                            <option value="">Pilih hasil follow-up...</option>
                            {STAGE1_HASIL_FOLLOWUP_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </Field>

                        {isNotEligible && (
                          <Field label="Not Eligible — isi manual" className="sm:col-span-2">
                            <input
                              value={form.notEligibleNote}
                              onChange={(e) => setForm((prev) => ({ ...prev, notEligibleNote: e.target.value }))}
                              placeholder="Kenapa tidak eligible..."
                              className="field-input"
                            />
                          </Field>
                        )}

                        {showAksi && (
                          <Field label="Aksi CRO" className="sm:col-span-2">
                            <select
                              value={form.aksiCro}
                              onChange={(e) => setForm((prev) => ({ ...prev, aksiCro: e.target.value }))}
                              className="field-input"
                            >
                              <option value="">Pilih aksi...</option>
                              {STAGE1_AKSI_CRO_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </Field>
                        )}

                        {showAlasan && (
                          <Field label="Alasan Penolakan" className="sm:col-span-2">
                            <select
                              value={form.alasanPenolakan}
                              onChange={(e) => setForm((prev) => ({ ...prev, alasanPenolakan: e.target.value }))}
                              className="field-input"
                            >
                              <option value="">Pilih alasan...</option>
                              {STAGE1_ALASAN_PENOLAKAN_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </Field>
                        )}
                      </>
                    )}

                    <Field label="Note (opsional)" className="sm:col-span-2">
                      <textarea
                        value={form.note}
                        onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                        className="field-input min-h-[56px] resize-y"
                        placeholder="Tulis informasi apa pun jika berkenan..."
                      />
                    </Field>
                  </div>
                </div>

                <div className="shrink-0 flex items-center justify-between gap-3 border-t border-border bg-secondary/30 px-3 py-2.5 sm:px-4">
                  <Link
                    href={`/leads/${selectedLead.id}`}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Detail lead →
                  </Link>
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
              </>
            )}
          </main>
        </div>
      </div>
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

'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { revalidateLeadsListing } from '@/app/actions/revalidate-leads'
import { createClient } from '@/lib/supabase/client'
import { cn, getTodayInWIB } from '@/lib/utils'
import {
  STAGE3_BOARD_COLUMNS,
  STAGE3_STATUS_OPTIONS,
  STAGE3_FAILED_REASON_OPTIONS,
  resolveStage3DropStatus,
} from '@/lib/prd-stages'
import { Clock3, FileText, MessageCircle, Users, X, Loader2, CheckCircle2, Pencil, ExternalLink } from 'lucide-react'
import { useCampaignOverrides } from '@/lib/use-campaign-overrides'
import { EntityBadge } from '@/components/leads/entity-badge'

const INITIAL_VISIBLE = 10
const LOAD_STEP = 10

export interface Stage3Lead {
  id: string
  full_name: string
  whatsapp_number: string
  source_campaign: string
  current_status: string
  lead_entry_date: string | null
  last_contacted_date: string | null
  updated_at?: string | null
  notes?: string | null
  funnel_notes: string | null
  lost_reason: string | null
  payments?: {
    id: string
    payment_type: string
    amount: number
    payment_method: string
    payment_date: string
    verification_status: string
    notes: string | null
    updated_at: string | null
  }[]
  users?: { id: string; name: string } | null
  expert_consultations?: {
    id: string
    expert_name: string | null
    consultation_result: string | null
    recommendation: string | null
    next_step: string | null
    scheduled_at: string | null
    completed_at: string | null
    updated_at: string | null
  }[]
}

type Stage3Payment = NonNullable<Stage3Lead['payments']>[number]

interface Props {
  initialLeads: Stage3Lead[]
}

function formatShortDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
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

function isSystemImportNote(value?: string | null) {
  const normalized = (value || '').trim().toLowerCase()
  return normalized === 'imported from csv' || normalized === 'input dari stage 2'
}

function cleanNotePreview(value?: string | null) {
  if (!value || isSystemImportNote(value)) return ''
  return value
}

function latestExpertNote(lead: Stage3Lead) {
  const latest = lead.expert_consultations?.[0]
  if (!latest) return ''
  return latest.recommendation || latest.consultation_result || latest.next_step || ''
}

function isPemetaanPayment(type: string) {
  return type === 'pemetaan' || type === 'roadmap_session'
}

function latestPayment(lead: Stage3Lead, type: 'pemetaan' | 'seat_lock') {
  const matches = (lead.payments || []).filter((payment) =>
    type === 'pemetaan' ? isPemetaanPayment(payment.payment_type) : payment.payment_type === 'seat_lock'
  )
  return matches.sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime())[0] || null
}

function formatRupiah(value: number) {
  return `Rp ${Number(value || 0).toLocaleString('id-ID')}`
}

export function Stage3Board({ initialLeads }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [leads, setLeads] = useState<Stage3Lead[]>(initialLeads)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({})
  const [moveError, setMoveError] = useState('')
  const [focusColumn, setFocusColumn] = useState<string | null>(null)
  const [detailLead, setDetailLead] = useState<Stage3Lead | null>(null)
  const campaignOverrides = useCampaignOverrides()

  const filtered = useMemo(
    () =>
      query
        ? leads.filter(
            (l) =>
              l.full_name.toLowerCase().includes(query.toLowerCase()) ||
              l.source_campaign?.toLowerCase().includes(query.toLowerCase())
          )
        : leads,
    [leads, query]
  )

  function getLeadsByColumn(key: string) {
    const col = STAGE3_BOARD_COLUMNS.find((c) => c.key === key)
    if (!col) return []
    return filtered.filter((l) => col.statuses.includes(l.current_status))
  }

  function getVisible(key: string) {
    return visibleCounts[key] || INITIAL_VISIBLE
  }

  async function moveLead(leadId: string, columnKey: string) {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return
    const newStatus = resolveStage3DropStatus(lead.current_status, columnKey)
    if (!newStatus || lead.current_status === newStatus) return
    const prev = leads
    setMoveError('')
    setLeads((p) => p.map((l) => (l.id === leadId ? { ...l, current_status: newStatus } : l)))
    try {
      const { data: auth } = await supabase.auth.getUser()
      const actor = auth.user?.id || null
      const [u, a] = await Promise.all([
        supabase.from('leads').update({ current_status: newStatus, updated_at: new Date().toISOString(), updated_by: actor }).eq('id', leadId),
        supabase.from('lead_activities').insert({ lead_id: leadId, activity_type: 'Stage 3', description: `Stage 3 -> ${newStatus} (geser kartu)`, created_by: actor }),
      ])
      if (u.error || a.error) throw u.error || a.error
      await revalidateLeadsListing()
      router.refresh()
    } catch (err) {
      setLeads(prev)
      setMoveError(err instanceof Error ? err.message : 'Gagal memindahkan lead')
    }
  }

  function onDragStart(_e: React.DragEvent, id: string) { setDragging(id) }
  function onDragEnd() { setDragging(null); setDragOver(null) }
  function onDragOver(e: React.DragEvent, key: string) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(key) }
  function onDrop(e: React.DragEvent, key: string) { e.preventDefault(); if (dragging) void moveLead(dragging, key); setDragging(null); setDragOver(null) }

  const openWA = useCallback((phone: string) => {
    const clean = phone.replace(/\D/g, '')
    const num = clean.startsWith('62') ? clean : clean.startsWith('0') ? `62${clean.slice(1)}` : `62${clean}`
    window.open(`https://wa.me/${num}`, '_blank')
  }, [])

  function renderColumn(key: string) {
    const col = STAGE3_BOARD_COLUMNS.find((c) => c.key === key)
    if (!col) return null
    const stageLeads = getLeadsByColumn(col.key)
    const visibleLeads = stageLeads.slice(0, getVisible(col.key))
    const hidden = Math.max(0, stageLeads.length - visibleLeads.length)
    const isOver = dragOver === col.key
    return (
      <div
        key={col.key}
        className="flex min-h-[24rem] flex-col rounded-2xl border transition-colors"
        style={{ background: isOver ? col.soft : 'hsl(var(--card))', borderColor: isOver ? col.color : 'hsl(var(--border))' }}
        onDragOver={(e) => onDragOver(e, col.key)}
        onDrop={(e) => onDrop(e, col.key)}
        onDragLeave={() => setDragOver(null)}
      >
        <div className="flex items-center justify-between gap-2 px-3.5 pt-3.5 pb-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: col.color }} />
            <span className="font-display text-sm font-semibold tracking-tight text-foreground truncate">{col.label}</span>
          </div>
          <span className="rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums" style={{ background: col.soft, color: col.color }}>{stageLeads.length}</span>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-2.5 pb-3">
          {stageLeads.length === 0 ? (
            <div className="flex h-24 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground" style={{ borderColor: isOver ? col.color : 'hsl(var(--border))' }}>
              {isOver ? 'Lepas di sini' : 'Kosong'}
            </div>
          ) : (
            <>
              {visibleLeads.map((lead) => {
                const lastTouched = lead.last_contacted_date || lead.updated_at || lead.lead_entry_date
                const notePreview = cleanNotePreview(latestExpertNote(lead)) || cleanNotePreview(lead.funnel_notes) || cleanNotePreview(lead.notes)

                return (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, lead.id)}
                  onDragEnd={onDragEnd}
                  className={cn(
                    'rounded-xl border border-border bg-background px-3 py-2.5 transition-all',
                    'hover:border-primary/25 cursor-grab active:cursor-grabbing',
                    dragging === lead.id && 'opacity-40 scale-[0.98]'
                  )}
                  style={{ borderLeftWidth: 3, borderLeftColor: col.color }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link href={`/leads/${lead.id}`} className="block text-[13px] font-semibold leading-snug text-foreground hover:text-accent line-clamp-2" onClick={(e) => e.stopPropagation()}>
                        {lead.full_name}
                      </Link>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{lead.source_campaign}</p>
                    </div>
                    <button type="button" onClick={() => openWA(lead.whatsapp_number)} className="shrink-0 rounded-lg border border-border p-1.5 text-emerald-700 hover:bg-emerald-500/10" title="WhatsApp">
                      <MessageCircle size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="inline-block rounded-md border border-border px-1.5 py-0.5 text-[10px] text-foreground">{lead.current_status}</span>
                    <EntityBadge sourceCampaign={lead.source_campaign} overrides={campaignOverrides} />
                    {lead.users?.name && <span className="truncate text-[10px] text-muted-foreground">PIC: {lead.users.name.split(' ')[0]}</span>}
                  </div>
                  <div className="mt-2 grid gap-1 rounded-lg bg-secondary/35 px-2 py-1.5 text-[10px] text-muted-foreground">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1"><Clock3 size={11} /> Terakhir disentuh</span>
                      <span className="font-semibold text-foreground">{formatShortDate(lastTouched)}</span>
                    </div>
                    {notePreview && (
                      <p className="line-clamp-2 border-t border-border/70 pt-1 leading-relaxed">
                        <FileText size={11} className="mr-1 inline" />
                        {notePreview}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => setDetailLead(lead)} className="mt-2 w-full rounded-lg border border-border bg-secondary/40 px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                    Detail Proses
                  </button>
                </div>
                )
              })}
              {hidden > 0 && (
                <button type="button" onClick={() => setVisibleCounts((p) => ({ ...p, [col.key]: (p[col.key] || INITIAL_VISIBLE) + LOAD_STEP }))} className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                  +{Math.min(LOAD_STEP, hidden)} lagi ({hidden})
                </button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            <Users size={13} />
            <span className="font-semibold tabular-nums text-foreground">{filtered.length}</span>
            <span>lead</span>
          </div>
          <input type="text" placeholder="Cari nama atau campaign..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-56 rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
          {focusColumn && <button type="button" onClick={() => setFocusColumn(null)} className="text-[11px] font-semibold text-accent hover:opacity-80">Tampilkan semua kolom</button>}
        </div>
        <p className="hidden text-[11px] text-muted-foreground lg:block">Geser kartu untuk pindah tahap, klik detail untuk update</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STAGE3_BOARD_COLUMNS.map((col) => {
          const count = getLeadsByColumn(col.key).length
          const active = focusColumn === col.key
          return (
            <button key={col.key} type="button" onClick={() => setFocusColumn((p) => (p === col.key ? null : col.key))} className={cn('rounded-xl border px-2.5 py-2 text-left transition-colors', active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-secondary/50')}>
              <p className="min-h-7 text-[10px] font-semibold leading-snug text-muted-foreground">{col.label}</p>
              <p className="mt-0.5 font-display text-xl font-semibold tracking-tight tabular-nums text-foreground">{count}</p>
            </button>
          )
        })}
      </div>

      {moveError && <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2 text-xs font-semibold text-destructive">{moveError}</div>}

      {focusColumn ? (
        <div className="grid grid-cols-1">{renderColumn(focusColumn)}</div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[1760px] grid-cols-8 gap-3">
            {STAGE3_BOARD_COLUMNS.map((col) => renderColumn(col.key))}
          </div>
        </div>
      )}

      {detailLead && (
        <Stage3DetailModal
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onSaved={(updated) => {
            setLeads((p) => p.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)))
            setDetailLead(null)
          }}
        />
      )}
    </div>
  )
}

type DetailForm = {
  status: string
  manualNote: string
  lastTouchedDate: string
  pemetaanNominal: string
  hasilExpert: string
  expertName: string
  expertDiscussion: string
  expertRecommendation: string
  croFollowUp: string
  leadResponse: string
  closingNominal: string
  coldLeadsNote: string
  failedReason: string
  akselerasiNote: string
}

function Stage3DetailModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: Stage3Lead
  onClose: () => void
  onSaved: (updated: Partial<Stage3Lead> & { id: string }) => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const pemetaanPayment = latestPayment(lead, 'pemetaan')
  const seatLockPayment = latestPayment(lead, 'seat_lock')
  const [form, setForm] = useState<DetailForm>({
    status: lead.current_status,
    manualNote: cleanNotePreview(lead.funnel_notes) || cleanNotePreview(lead.notes),
    lastTouchedDate: toDateTimeInputValue(lead.last_contacted_date || lead.updated_at || lead.lead_entry_date),
    pemetaanNominal: pemetaanPayment ? String(Number(pemetaanPayment.amount || 0)) : '',
    hasilExpert: '',
    expertName: lead.expert_consultations?.[0]?.expert_name || '',
    expertDiscussion: lead.expert_consultations?.[0]?.consultation_result || '',
    expertRecommendation: lead.expert_consultations?.[0]?.recommendation || '',
    croFollowUp: '',
    leadResponse: '',
    closingNominal: seatLockPayment ? String(Number(seatLockPayment.amount || 0)) : '',
    coldLeadsNote: '',
    failedReason: lead.lost_reason || '',
    akselerasiNote: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    setMounted(true)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const showHasilExpert = form.status === 'Menunggu jadwal expert consultation'
  const showClosing = form.status === 'Closing Seat Lock'
  const showCold = form.status === 'Cold Leads'
  const showFailed = form.status === 'Failed'
  const showAkselerasi = form.status === 'Jalur Akselerasi'

  function canSave() {
    if (!form.status) return false
    if (showFailed && !form.failedReason) return false
    if (showClosing && !seatLockPayment && !form.closingNominal.trim()) return false
    return true
  }

  async function savePayment(
    type: 'pemetaan' | 'seat_lock',
    nominalValue: string,
    existing: Stage3Payment | null,
    actor: string | null,
    notes: string
  ): Promise<Stage3Payment | null> {
    if (!nominalValue.trim()) return existing
    const nominal = Number(nominalValue.replace(/[^\d]/g, ''))
    if (Number.isNaN(nominal) || nominal <= 0) return existing

    const payload = {
      lead_id: lead.id,
      payment_type: type,
      amount: nominal,
      payment_method: existing?.payment_method || 'Transfer',
      payment_date: existing?.payment_date || getTodayInWIB(),
      verification_status: existing?.verification_status || 'verified',
      verified_by: actor,
      verified_at: new Date().toISOString(),
      notes: existing?.notes || notes,
      updated_at: new Date().toISOString(),
    }
    const result = existing
      ? await supabase.from('payments').update(payload).eq('id', existing.id).select('*').single()
      : await supabase.from('payments').insert(payload).select('*').single()

    if (result.error) throw result.error
    return result.data as Stage3Payment
  }

  async function handleSave() {
    if (saving || !canSave()) return
    setSaving(true)
    setError('')
    const { data: auth } = await supabase.auth.getUser()
    const actor = auth.user?.id || null

    const funnelParts: string[] = []
    if (form.manualNote.trim()) funnelParts.push(`Catatan Stage 3: ${form.manualNote.trim()}`)
    if (showHasilExpert && form.hasilExpert.trim()) funnelParts.push(`Hasil Expert: ${form.hasilExpert.trim()}`)
    if (form.expertDiscussion.trim()) funnelParts.push(`Diskusi CRO-Expert: ${form.expertDiscussion.trim()}`)
    if (form.expertRecommendation.trim()) funnelParts.push(`Rekomendasi Expert: ${form.expertRecommendation.trim()}`)
    if (form.croFollowUp.trim()) funnelParts.push(`Tindak lanjut CRO: ${form.croFollowUp.trim()}`)
    if (form.leadResponse.trim()) funnelParts.push(`Respon Lead: ${form.leadResponse.trim()}`)
    if (showCold && form.coldLeadsNote.trim()) funnelParts.push(`Cold Leads: ${form.coldLeadsNote.trim()}`)
    if (showAkselerasi && form.akselerasiNote.trim()) funnelParts.push(`Jalur Akselerasi: ${form.akselerasiNote.trim()}`)
    const funnelNotes = funnelParts.join(' | ') || cleanNotePreview(lead.funnel_notes) || null

    const { error: uErr } = await supabase
      .from('leads')
      .update({
        current_status: form.status,
        lost_reason: showFailed ? form.failedReason : null,
        funnel_notes: funnelNotes,
        last_contacted_date: toTimestamp(form.lastTouchedDate),
        updated_by: actor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id)

    if (uErr) {
      setSaving(false)
      setError(uErr.message)
      return
    }

    let savedPemetaan: Stage3Payment | null = pemetaanPayment
    let savedSeatLock: Stage3Payment | null = seatLockPayment
    try {
      savedPemetaan = await savePayment('pemetaan', form.pemetaanNominal, pemetaanPayment, actor, 'Input pemetaan dari Stage 3')
      savedSeatLock = await savePayment('seat_lock', form.closingNominal, seatLockPayment, actor, 'Input seat lock dari Stage 3')
    } catch (paymentError) {
      setSaving(false)
      setError(paymentError instanceof Error ? paymentError.message : 'Gagal menyimpan pembayaran.')
      return
    }

    if (
      form.expertName.trim() ||
      form.expertDiscussion.trim() ||
      form.expertRecommendation.trim() ||
      form.croFollowUp.trim() ||
      form.leadResponse.trim()
    ) {
      await supabase.from('expert_consultations').insert({
        lead_id: lead.id,
        expert_name: form.expertName.trim() || null,
        scheduled_at: null,
        completed_at: toTimestamp(form.lastTouchedDate),
        consultation_result: [
          form.expertDiscussion.trim() && `Diskusi: ${form.expertDiscussion.trim()}`,
          form.leadResponse.trim() && `Respon lead: ${form.leadResponse.trim()}`,
        ].filter(Boolean).join('\n') || null,
        recommendation: form.expertRecommendation.trim() || null,
        next_step: form.croFollowUp.trim() || null,
      })
    }

    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      activity_type: 'Stage 3',
      description: [
        `Stage 3 -> ${form.status}${showFailed ? ` (${form.failedReason})` : ''}`,
        form.manualNote.trim() && `Catatan: ${form.manualNote.trim()}`,
        form.expertRecommendation.trim() && `Rekomendasi expert: ${form.expertRecommendation.trim()}`,
        form.croFollowUp.trim() && `Tindak lanjut CRO: ${form.croFollowUp.trim()}`,
        form.leadResponse.trim() && `Respon lead: ${form.leadResponse.trim()}`,
      ].filter(Boolean).join(' | '),
      created_by: actor,
    })

    await revalidateLeadsListing()
    router.refresh()
    setSaving(false)
    const updatedPayments = (lead.payments || []).filter(
      (payment) => payment.id !== pemetaanPayment?.id && payment.id !== seatLockPayment?.id
    )
    if (savedPemetaan) updatedPayments.push(savedPemetaan)
    if (savedSeatLock) updatedPayments.push(savedSeatLock)
    onSaved({
      id: lead.id,
      current_status: form.status,
      lost_reason: showFailed ? form.failedReason : null,
      funnel_notes: funnelNotes,
      last_contacted_date: toTimestamp(form.lastTouchedDate),
      payments: updatedPayments,
    })
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(27,42,74,0.45)' }}>
      {saving && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-xl">
            <Loader2 size={19} className="animate-spin text-accent" />
            <div>
              <p className="text-sm font-semibold text-foreground">Menyimpan perubahan...</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Status dan catatan sedang diperbarui.</p>
            </div>
          </div>
        </div>
      )}
      <div className="h-full w-full overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="flex w-full max-w-md max-h-[min(36rem,calc(100vh-2rem))] flex-col rounded-2xl border border-border bg-card shadow-xl"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-base font-semibold text-foreground">Detail Proses</h3>
                <p className="truncate text-[11px] text-muted-foreground">{lead.full_name} - {lead.whatsapp_number}</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary">
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {error && <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] font-medium text-destructive">{error}</div>}
              {!isEditing ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-secondary/30 p-3">
                    <p className="text-[11px] font-semibold text-muted-foreground">STATUS PROSES</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{lead.current_status}</p>
                    <p className="mt-2 text-xs text-muted-foreground">Terakhir disentuh: {formatShortDate(lead.last_contacted_date || lead.updated_at || lead.lead_entry_date)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <SummaryItem label="Pemetaan" value={pemetaanPayment ? `${formatRupiah(pemetaanPayment.amount)} - ${pemetaanPayment.verification_status}` : 'Belum tercatat'} />
                    <SummaryItem label="Seat lock" value={seatLockPayment ? `${formatRupiah(seatLockPayment.amount)} - ${seatLockPayment.verification_status}` : 'Belum tercatat'} />
                  </div>
                  {(cleanNotePreview(lead.funnel_notes) || cleanNotePreview(lead.notes)) && (
                    <SummaryItem label="Catatan terakhir" value={cleanNotePreview(lead.funnel_notes) || cleanNotePreview(lead.notes)} wide />
                  )}
                  {latestExpertNote(lead) && <SummaryItem label="Catatan expert" value={latestExpertNote(lead)} wide />}
                  <Link href={`/leads/${lead.id}`} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary">
                    <ExternalLink size={14} /> Lihat detail lead lengkap
                  </Link>
                </div>
              ) : (
              <div className="grid grid-cols-1 gap-3">
                <Field label="Status proses">
                  <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="field-input">
                    {STAGE3_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Tanggal terakhir disentuh">
                    <input
                      type="datetime-local"
                      value={form.lastTouchedDate}
                      onChange={(e) => setForm((p) => ({ ...p, lastTouchedDate: e.target.value }))}
                      className="field-input"
                    />
                  </Field>
                  <Field label="PIC / expert terkait">
                    <input
                      value={form.expertName}
                      onChange={(e) => setForm((p) => ({ ...p, expertName: e.target.value }))}
                      className="field-input"
                      placeholder="Nama expert / sensei jika ada"
                    />
                  </Field>
                </div>

                <Field label="Catatan manual">
                  <textarea
                    value={form.manualNote}
                    onChange={(e) => setForm((p) => ({ ...p, manualNote: e.target.value }))}
                    className="field-input min-h-[64px] resize-y"
                    placeholder="Catatan singkat: kendala, progress, atau update terakhir..."
                  />
                </Field>

                <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Pembayaran lead</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Nominal yang sudah tercatat dapat diubah di sini. Jika belum ada, isi nominal untuk mencatat pembayaran baru.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={pemetaanPayment ? `Pemetaan tercatat: ${formatRupiah(pemetaanPayment.amount)} (${pemetaanPayment.verification_status})` : 'Pemetaan belum tercatat'}>
                      <input
                        inputMode="numeric"
                        value={form.pemetaanNominal}
                        onChange={(e) => setForm((p) => ({ ...p, pemetaanNominal: e.target.value.replace(/[^\d]/g, '') }))}
                        placeholder="Isi nominal pemetaan"
                        className="field-input"
                      />
                    </Field>
                    <Field label={seatLockPayment ? `Seat lock tercatat: ${formatRupiah(seatLockPayment.amount)} (${seatLockPayment.verification_status})` : 'Seat lock belum tercatat'}>
                      <input
                        inputMode="numeric"
                        value={form.closingNominal}
                        onChange={(e) => setForm((p) => ({ ...p, closingNominal: e.target.value.replace(/[^\d]/g, '') }))}
                        placeholder="Isi nominal seat lock"
                        className="field-input"
                      />
                    </Field>
                  </div>
                </div>

                {showHasilExpert && (
                  <Field label="Hasil Expert (manual)">
                    <textarea value={form.hasilExpert} onChange={(e) => setForm((p) => ({ ...p, hasilExpert: e.target.value }))} className="field-input min-h-[56px] resize-y" placeholder="Tulis hasil expert..." />
                  </Field>
                )}

                {(form.status === 'Menunggu jadwal expert consultation' || form.expertName || form.expertDiscussion || form.expertRecommendation) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">Log interaksi CRO & expert</p>
                    <div className="grid gap-3">
                      <Field label="Apa yang disampaikan CRO ke expert?">
                        <textarea value={form.expertDiscussion} onChange={(e) => setForm((p) => ({ ...p, expertDiscussion: e.target.value }))} className="field-input min-h-[56px] resize-y" placeholder="Konteks lead, kendala, pertanyaan CRO..." />
                      </Field>
                      <Field label="Rekomendasi / masukan expert">
                        <textarea value={form.expertRecommendation} onChange={(e) => setForm((p) => ({ ...p, expertRecommendation: e.target.value }))} className="field-input min-h-[56px] resize-y" placeholder="Saran expert untuk konversi / persuasi..." />
                      </Field>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Tindak lanjut CRO">
                          <textarea value={form.croFollowUp} onChange={(e) => setForm((p) => ({ ...p, croFollowUp: e.target.value }))} className="field-input min-h-[56px] resize-y" placeholder="Apa yang sudah / akan dilakukan CRO..." />
                        </Field>
                        <Field label="Respon lead setelah expert">
                          <textarea value={form.leadResponse} onChange={(e) => setForm((p) => ({ ...p, leadResponse: e.target.value }))} className="field-input min-h-[56px] resize-y" placeholder="Respon anak / orang tua setelah arahan expert..." />
                        </Field>
                      </div>
                    </div>
                  </div>
                )}
                {showCold && (
                  <Field label="Kondisi cold leads">
                    <textarea value={form.coldLeadsNote} onChange={(e) => setForm((p) => ({ ...p, coldLeadsNote: e.target.value }))} className="field-input min-h-[56px] resize-y" placeholder="Kondisi lead..." />
                  </Field>
                )}
                {showAkselerasi && (
                  <Field label="Kondisi jalur akselerasi">
                    <textarea value={form.akselerasiNote} onChange={(e) => setForm((p) => ({ ...p, akselerasiNote: e.target.value }))} className="field-input min-h-[56px] resize-y" placeholder="Kondisi jalur akselerasi..." />
                  </Field>
                )}
                {showFailed && (
                  <Field label="Alasan failed">
                    <select value={form.failedReason} onChange={(e) => setForm((p) => ({ ...p, failedReason: e.target.value }))} className="field-input">
                      <option value="">Pilih alasan...</option>
                      {STAGE3_FAILED_REASON_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-secondary/30 px-4 py-3">
              <button type="button" onClick={isEditing ? () => setIsEditing(false) : onClose} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                {isEditing ? 'Kembali' : 'Tutup'}
              </button>
              {isEditing ? (
                <button type="button" disabled={saving || !canSave()} onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  Simpan
                </button>
              ) : (
                <button type="button" onClick={() => setIsEditing(true)} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
                  <Pencil size={15} /> Edit proses
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function SummaryItem({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-3', wide && 'col-span-full')}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xs leading-relaxed text-foreground">{value}</p>
    </div>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-[11px] font-semibold text-foreground/80">{label}</span>
      {children}
    </label>
  )
}

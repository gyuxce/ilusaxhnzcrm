'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { cn, getTodayInWIB } from '@/lib/utils'
import {
  STAGE3_BOARD_COLUMNS,
  STAGE3_STATUS_OPTIONS,
  STAGE3_FAILED_REASON_OPTIONS,
  resolveStage3DropStatus,
  getStage3Column,
  type Stage3ColumnKey,
} from '@/lib/prd-stages'
import { MessageCircle, Users, X, Loader2, CheckCircle2 } from 'lucide-react'

const INITIAL_VISIBLE = 10
const LOAD_STEP = 10

export interface Stage3Lead {
  id: string
  full_name: string
  whatsapp_number: string
  source_campaign: string
  current_status: string
  lead_entry_date: string | null
  funnel_notes: string | null
  lost_reason: string | null
  users?: { id: string; name: string } | null
}

interface Props {
  initialLeads: Stage3Lead[]
}

const BOARD_ROWS: Stage3ColumnKey[][] = [
  ['pemetaan', 'expert', 'seatlock', 'closing'],
  ['exit'],
]

export function Stage3Board({ initialLeads }: Props) {
  const supabase = createClient()
  const [leads, setLeads] = useState<Stage3Lead[]>(initialLeads)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({})
  const [moveError, setMoveError] = useState('')
  const [focusColumn, setFocusColumn] = useState<string | null>(null)
  const [detailLead, setDetailLead] = useState<Stage3Lead | null>(null)

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
        supabase.from('lead_activities').insert({ lead_id: leadId, activity_type: 'Stage 3', description: `Stage 3 → ${newStatus} (drag)`, created_by: actor }),
      ])
      if (u.error || a.error) throw u.error || a.error
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
              {visibleLeads.map((lead) => (
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
                    {lead.users?.name && <span className="truncate text-[10px] text-muted-foreground">{lead.users.name.split(' ')[0]}</span>}
                  </div>
                  <button type="button" onClick={() => setDetailLead(lead)} className="mt-2 w-full rounded-lg border border-border bg-secondary/40 px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
                    Detail Stage 3
                  </button>
                </div>
              ))}
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
        <p className="hidden text-[11px] text-muted-foreground lg:block">Drag kartu untuk pindah tahap · klik Detail untuk update</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {STAGE3_BOARD_COLUMNS.map((col) => {
          const count = getLeadsByColumn(col.key).length
          const active = focusColumn === col.key
          return (
            <button key={col.key} type="button" onClick={() => setFocusColumn((p) => (p === col.key ? null : col.key))} className={cn('rounded-xl border px-2.5 py-2 text-left transition-colors', active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-secondary/50')}>
              <p className="truncate text-[10px] font-semibold text-muted-foreground">{col.label}</p>
              <p className="mt-0.5 font-display text-xl font-semibold tracking-tight tabular-nums text-foreground">{count}</p>
            </button>
          )
        })}
      </div>

      {moveError && <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2 text-xs font-semibold text-destructive">{moveError}</div>}

      {focusColumn ? (
        <div className="grid grid-cols-1">{renderColumn(focusColumn)}</div>
      ) : (
        <div className="space-y-3">
          {BOARD_ROWS.map((row, i) => (
            <div key={i} className={cn('grid gap-3', i === 0 ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-1')}>
              {row.map((k) => renderColumn(k))}
            </div>
          ))}
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
  hasilExpert: string
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
  const supabase = createClient()
  const [form, setForm] = useState<DetailForm>({
    status: lead.current_status,
    hasilExpert: '',
    closingNominal: '',
    coldLeadsNote: '',
    failedReason: lead.lost_reason || '',
    akselerasiNote: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

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
    if (showClosing && !form.closingNominal.trim()) return false
    return true
  }

  async function handleSave() {
    if (saving || !canSave()) return
    setSaving(true)
    setError('')
    const { data: auth } = await supabase.auth.getUser()
    const actor = auth.user?.id || null

    const funnelParts: string[] = []
    if (showHasilExpert && form.hasilExpert.trim()) funnelParts.push(`Hasil Expert: ${form.hasilExpert.trim()}`)
    if (showCold && form.coldLeadsNote.trim()) funnelParts.push(`Cold Leads: ${form.coldLeadsNote.trim()}`)
    if (showAkselerasi && form.akselerasiNote.trim()) funnelParts.push(`Jalur Akselerasi: ${form.akselerasiNote.trim()}`)
    const funnelNotes = funnelParts.join(' · ') || lead.funnel_notes || null

    const { error: uErr } = await supabase
      .from('leads')
      .update({
        current_status: form.status,
        lost_reason: showFailed ? form.failedReason : null,
        funnel_notes: funnelNotes,
        last_contacted_date: getTodayInWIB(),
        updated_by: actor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id)

    if (uErr) {
      setSaving(false)
      setError(uErr.message)
      return
    }

    if (showClosing && form.closingNominal.trim()) {
        const nominal = Number(form.closingNominal.replace(/[^\d]/g, ''))
        if (!Number.isNaN(nominal) && nominal > 0) {
        await supabase.from('payments').insert({
          lead_id: lead.id,
          payment_type: 'seat_lock',
          amount: nominal,
          payment_method: 'Transfer',
          payment_date: getTodayInWIB(),
          verification_status: 'verified',
          verified_by: actor,
          verified_at: new Date().toISOString(),
          notes: 'Closing Seat Lock dari Stage 3',
        })
      }
    }

    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      activity_type: 'Stage 3',
      description: `Stage 3 → ${form.status}${showFailed ? ` (${form.failedReason})` : ''}`,
      created_by: actor,
    })

    setSaving(false)
    onSaved({ id: lead.id, current_status: form.status, lost_reason: showFailed ? form.failedReason : null, funnel_notes: funnelNotes })
  }

  if (!mounted) return null

  return createPortal(
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
                <h3 className="truncate font-display text-base font-semibold text-foreground">Detail Stage 3</h3>
                <p className="truncate text-[11px] text-muted-foreground">{lead.full_name} · {lead.whatsapp_number}</p>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary">
                <X size={16} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {error && <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-[11px] font-medium text-destructive">{error}</div>}
              <div className="grid grid-cols-1 gap-3">
                <Field label="Status Stage 3">
                  <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className="field-input">
                    {STAGE3_STATUS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </Field>

                {showHasilExpert && (
                  <Field label="Hasil Expert (manual)">
                    <textarea value={form.hasilExpert} onChange={(e) => setForm((p) => ({ ...p, hasilExpert: e.target.value }))} className="field-input min-h-[56px] resize-y" placeholder="Tulis hasil expert..." />
                  </Field>
                )}
                {showClosing && (
                  <Field label="Closing Seat Lock — nominal (angka saja, tanpa titik / Rp)">
                    <input inputMode="numeric" value={form.closingNominal} onChange={(e) => setForm((p) => ({ ...p, closingNominal: e.target.value.replace(/[^\d]/g, '') }))} placeholder="3000000" className="field-input" />
                  </Field>
                )}
                {showCold && (
                  <Field label="Cold Leads — kondisi (manual)">
                    <textarea value={form.coldLeadsNote} onChange={(e) => setForm((p) => ({ ...p, coldLeadsNote: e.target.value }))} className="field-input min-h-[56px] resize-y" placeholder="Kondisi lead..." />
                  </Field>
                )}
                {showAkselerasi && (
                  <Field label="Jalur Akselerasi — kondisi (manual)">
                    <textarea value={form.akselerasiNote} onChange={(e) => setForm((p) => ({ ...p, akselerasiNote: e.target.value }))} className="field-input min-h-[56px] resize-y" placeholder="Kondisi jalur akselerasi..." />
                  </Field>
                )}
                {showFailed && (
                  <Field label="Failed — alasan">
                    <select value={form.failedReason} onChange={(e) => setForm((p) => ({ ...p, failedReason: e.target.value }))} className="field-input">
                      <option value="">Pilih alasan...</option>
                      {STAGE3_FAILED_REASON_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-secondary/30 px-4 py-3">
              <button type="button" onClick={onClose} className="text-xs font-semibold text-muted-foreground hover:text-foreground">Batal</button>
              <button type="button" disabled={saving || !canSave()} onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
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

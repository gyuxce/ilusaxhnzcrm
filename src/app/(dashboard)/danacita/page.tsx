'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Loader2, Plus, Search, X, MessageCircle } from 'lucide-react'
import {
  DANACITA_LABEL_OPTIONS,
  DANACITA_STATUS_OPTIONS,
  DANACITA_FLOW_LABEL,
  DANACITA_STATUS_COLOR,
  danacitaLabelText,
  danacitaStatusNeedsReason,
} from '@/lib/danacita'
import type { DanacitaFlow, DanacitaLabel, DanacitaStatus } from '@/lib/supabase/types'

type ApplicationRow = {
  id: string
  lead_id: string
  flow: DanacitaFlow
  label: DanacitaLabel
  status: DanacitaStatus
  status_reason: string | null
  last_status_changed_at: string
  leads: { id: string; full_name: string; whatsapp_number: string; current_status: string } | null
}

type LeadOption = {
  id: string
  full_name: string
  whatsapp_number: string
  current_status: string
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DanacitaPage() {
  const supabase = createClient()
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [leadQuery, setLeadQuery] = useState('')
  const [leadOptions, setLeadOptions] = useState<LeadOption[]>([])
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null)
  const [newLabel, setNewLabel] = useState<DanacitaLabel>('keberangkatan')
  const [addSaving, setAddSaving] = useState(false)
  const [addError, setAddError] = useState('')

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    const { data, error: fetchErr } = await supabase
      .from('danacita_applications')
      .select('id, lead_id, flow, label, status, status_reason, last_status_changed_at, leads(id, full_name, whatsapp_number, current_status)')
      .order('last_status_changed_at', { ascending: false })
      .limit(2000)
    if (fetchErr) setError(fetchErr.message)
    setApplications((data || []) as unknown as ApplicationRow[])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  useEffect(() => {
    if (!showAddModal || leadQuery.trim().length < 2) {
      setLeadOptions([])
      return
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from('leads')
        .select('id, full_name, whatsapp_number, current_status')
        .or(`full_name.ilike.%${leadQuery}%,whatsapp_number.ilike.%${leadQuery}%`)
        .limit(10)
      setLeadOptions((data || []) as LeadOption[])
    }, 300)
    return () => clearTimeout(timeout)
  }, [leadQuery, showAddModal, supabase])

  async function handleUpdateStatus(app: ApplicationRow, status: DanacitaStatus, reason: string) {
    setSavingId(app.id)
    const { data: auth } = await supabase.auth.getUser()
    const actor = auth.user?.id || null
    const { error: updateErr } = await supabase
      .from('danacita_applications')
      .update({
        status,
        status_reason: danacitaStatusNeedsReason(status) ? reason || null : null,
        last_status_changed_at: new Date().toISOString(),
        updated_by: actor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', app.id)
    if (!updateErr) {
      setApplications((prev) =>
        prev.map((a) =>
          a.id === app.id
            ? { ...a, status, status_reason: danacitaStatusNeedsReason(status) ? reason || null : null, last_status_changed_at: new Date().toISOString() }
            : a
        )
      )
    }
    setSavingId(null)
  }

  async function handleAddApplication() {
    if (!selectedLead) return
    setAddSaving(true)
    setAddError('')
    const { data: auth } = await supabase.auth.getUser()
    const actor = auth.user?.id || null
    const flow: DanacitaFlow = selectedLead.current_status === 'Cold Leads' ? 'cold' : 'hot'
    const { data, error: insertErr } = await supabase
      .from('danacita_applications')
      .insert({
        lead_id: selectedLead.id,
        flow,
        label: newLabel,
        status: 'sedang_ditinjau',
        created_by: actor,
        updated_by: actor,
      })
      .select('id, lead_id, flow, label, status, status_reason, last_status_changed_at, leads(id, full_name, whatsapp_number, current_status)')
      .single()
    setAddSaving(false)
    if (insertErr) {
      setAddError(insertErr.message)
      return
    }
    setApplications((prev) => [data as unknown as ApplicationRow, ...prev])
    setShowAddModal(false)
    setSelectedLead(null)
    setLeadQuery('')
    setNewLabel('keberangkatan')
  }

  const openWA = (phone: string) => {
    const clean = phone.replace(/\D/g, '')
    const num = clean.startsWith('62') ? clean : clean.startsWith('0') ? `62${clean.slice(1)}` : `62${clean}`
    window.open(`https://wa.me/${num}`, '_blank')
  }

  const rows = useMemo(() => applications, [applications])

  return (
    <>
      <Header
        title="Payment via Danacita"
        subtitle="Track pengajuan pendanaan Danacita — hasil di-update manual berdasarkan konfirmasi dari tim Danacita."
      />
      <div className="w-full p-6 space-y-4 font-sans">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {loading ? 'Memuat...' : `${rows.length} pengajuan`}
          </p>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:opacity-90"
          >
            <Plus size={14} />
            Tambah pengajuan
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2 text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="glass-card rounded-2xl overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Lead</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Flow</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Label</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Status</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">Terakhir diubah</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">WA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground">
                      <Loader2 className="mx-auto animate-spin" size={20} />
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground/40">
                      Belum ada pengajuan Danacita.
                    </td>
                  </tr>
                ) : (
                  rows.map((app) => (
                    <ApplicationRowView
                      key={app.id}
                      app={app}
                      saving={savingId === app.id}
                      onUpdateStatus={handleUpdateStatus}
                      onOpenWA={openWA}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(27,42,74,0.45)' }}>
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-base font-semibold text-foreground">Tambah pengajuan Danacita</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary">
                <X size={16} />
              </button>
            </div>

            {!selectedLead ? (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Cari lead (nama/WhatsApp)</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                  <input
                    value={leadQuery}
                    onChange={(e) => setLeadQuery(e.target.value)}
                    placeholder="Ketik minimal 2 huruf..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-xs bg-background text-foreground border border-border outline-none"
                    autoFocus
                  />
                </div>
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {leadOptions.map((lead) => (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => setSelectedLead(lead)}
                      className="w-full rounded-lg border border-transparent px-2.5 py-2 text-left hover:border-border hover:bg-secondary/50"
                    >
                      <p className="text-xs font-semibold text-foreground">{lead.full_name}</p>
                      <p className="text-[10px] text-muted-foreground">{lead.whatsapp_number} · {lead.current_status}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{selectedLead.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedLead.whatsapp_number} · {selectedLead.current_status}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedLead(null)} className="text-[10px] text-accent font-semibold">
                    Ganti
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Label pengajuan</label>
                  <select
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value as DanacitaLabel)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-background text-foreground border border-border outline-none"
                  >
                    {DANACITA_LABEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Flow otomatis: <strong>{selectedLead.current_status === 'Cold Leads' ? 'Cold (pengajuan mandiri)' : 'Hot (arahan CRO)'}</strong> — berdasarkan status lead saat ini.
                </p>
                {addError && <p className="text-[10px] text-destructive">{addError}</p>}
                <button
                  type="button"
                  disabled={addSaving}
                  onClick={handleAddApplication}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-accent-foreground bg-accent hover:opacity-90 disabled:opacity-50"
                >
                  {addSaving ? 'Menyimpan...' : 'Simpan pengajuan'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function ApplicationRowView({
  app,
  saving,
  onUpdateStatus,
  onOpenWA,
}: {
  app: ApplicationRow
  saving: boolean
  onUpdateStatus: (app: ApplicationRow, status: DanacitaStatus, reason: string) => void
  onOpenWA: (phone: string) => void
}) {
  const [status, setStatus] = useState(app.status)
  const [reason, setReason] = useState(app.status_reason || '')
  const needsReason = danacitaStatusNeedsReason(status)
  const colors = DANACITA_STATUS_COLOR[status]
  const dirty = status !== app.status || reason !== (app.status_reason || '')

  return (
    <tr className="hover:bg-secondary/30 transition-colors align-top">
      <td className="px-3 py-2.5 min-w-[10rem]">
        <p className="text-[12px] font-semibold text-foreground">{app.leads?.full_name || '—'}</p>
        <p className="text-[10px] text-muted-foreground">{app.leads?.whatsapp_number}</p>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-muted-foreground">
        {DANACITA_FLOW_LABEL[app.flow]}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-[11px] text-foreground">
        {danacitaLabelText(app.label)}
      </td>
      <td className="px-3 py-2.5 min-w-[13rem]">
        <div className="flex flex-col gap-1.5">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DanacitaStatus)}
            className="rounded-lg border px-2 py-1 text-[11px] font-semibold outline-none"
            style={{ borderColor: colors.color, background: colors.soft, color: colors.color }}
          >
            {DANACITA_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {needsReason && (
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={status === 'tidak_eligible' ? 'Alasan tidak eligible...' : 'Catatan...'}
              className="rounded-lg border border-border bg-background px-2 py-1 text-[11px] text-foreground outline-none"
            />
          )}
          {dirty && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onUpdateStatus(app, status, reason)}
              className={cn(
                'rounded-lg px-2 py-1 text-[10px] font-semibold text-accent-foreground bg-accent hover:opacity-90',
                saving && 'opacity-50'
              )}
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-[10px] text-muted-foreground">
        {formatDateTime(app.last_status_changed_at)}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        {app.leads?.whatsapp_number && (
          <button
            type="button"
            onClick={() => onOpenWA(app.leads!.whatsapp_number)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-emerald-700 hover:bg-emerald-500/10"
          >
            <MessageCircle size={14} />
          </button>
        )}
      </td>
    </tr>
  )
}

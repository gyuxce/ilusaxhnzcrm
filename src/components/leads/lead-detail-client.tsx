'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Clock, Edit, ClipboardCheck, ListChecks, KanbanSquare, X, Loader2, DollarSign, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStageBadgeClasses } from '@/lib/brand'
import {
  STAGE1_CURRENT_STATUS_OPTIONS,
  STAGE2_VISIBLE_STATUSES,
  STAGE3_STATUS_OPTIONS,
  ALL_PRD_STATUSES,
  STAGE1_LEGACY_NEW_LEAD,
  getStage3Column,
  isStage2EntryStatus,
} from '@/lib/prd-stages'
import type { LeadDetailProps, LeadWithUsers, ActivityWithUser, UserSummary } from '@/types/crm'
import { LOST_REASON_OPTIONS, LOST_STATUSES } from '@/lib/lost-reasons'
import { isJsonRecord } from '@/types/crm'
import type { PaymentRow } from '@/lib/supabase/types'

function displayStatus(status: string) {
  return status === STAGE1_LEGACY_NEW_LEAD ? 'Input Manual' : status
}

function resolvePrdLane(status: string): 'stage1' | 'stage2' | 'stage3' | 'exit' | 'other' {
  const s = displayStatus(status)
  if ((STAGE1_CURRENT_STATUS_OPTIONS as readonly string[]).includes(s) || status === STAGE1_LEGACY_NEW_LEAD) {
    return 'stage1'
  }
  if ((STAGE2_VISIBLE_STATUSES as readonly string[]).includes(status) || isStage2EntryStatus(status)) return 'stage2'
  if ((STAGE3_STATUS_OPTIONS as readonly string[]).includes(status) || getStage3Column(status)) return 'stage3'
  if (LOST_STATUSES.includes(status) || status === 'Cold Leads' || status === 'Failed') return 'exit'
  return 'other'
}

const LANE_LABEL: Record<string, string> = {
  stage1: 'Stage 1 · Leads',
  stage2: 'Stage 2 · Interested',
  stage3: 'Stage 3 · Pipeline',
  exit: 'Keluar',
  other: 'Lainnya',
}

export function LeadDetailClient({
  initialLead,
  initialPayments,
  initialActivities,
  pics,
}: LeadDetailProps) {
  const [lead, setLead] = useState<LeadWithUsers>(initialLead)
  const [payments, setPayments] = useState<PaymentRow[]>(initialPayments)
  const [activities, setActivities] = useState<ActivityWithUser[]>(initialActivities)
  const [isEditingCore, setIsEditingCore] = useState(false)
  const [isEditingPayment, setIsEditingPayment] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentRow | null>(null)
  const [paymentType, setPaymentType] = useState('pemetaan')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState('Transfer')
  const [paymentStatus, setPaymentStatus] = useState('verified')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [editName, setEditName] = useState(lead.full_name)
  const [editPhone, setEditPhone] = useState(lead.whatsapp_number)
  const [editSource, setEditSource] = useState(lead.source_campaign)
  const [editStatus, setEditStatus] = useState(displayStatus(lead.current_status))
  const [editNotes, setEditNotes] = useState(lead.notes || '')
  const [editLostReason, setEditLostReason] = useState(lead.lost_reason || '')
  const [coreError, setCoreError] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()
  const lane = resolvePrdLane(lead.current_status)
  const totalPemetaan = payments
    .filter((payment) => payment.payment_type === 'pemetaan' || payment.payment_type === 'roadmap_session')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const totalSeatLock = payments
    .filter((payment) => payment.payment_type === 'seat_lock')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

  const formatRupiah = (value: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(value)

  const normalizePhone = (value: string) => {
    let cleanPhone = value.replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1)
    else if (cleanPhone.startsWith('8')) cleanPhone = '62' + cleanPhone
    return cleanPhone
  }

  const friendlyDuplicateError = (err?: unknown) => {
    const payload = isJsonRecord(err) ? err : null
    const duplicateLead = isJsonRecord(payload?.duplicate_lead) ? payload.duplicate_lead : null
    if (duplicateLead) {
      return `Nomor WhatsApp ini sudah terdaftar untuk ${duplicateLead.full_name} (${duplicateLead.source_campaign || 'tanpa campaign'}) dengan status ${duplicateLead.current_status || '-'}.`
    }
    const message = typeof payload?.message === 'string' ? payload.message : ''
    return message || 'Terjadi kesalahan saat menyimpan data lead.'
  }

  const logActivity = async (type: string, desc: string, userId?: string | null) => {
    const actorId =
      userId === undefined ? (await supabase.auth.getUser()).data.user?.id || null : userId
    const { data: newAct, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: lead.id,
        activity_type: type,
        description: desc,
        created_by: actorId,
      })
      .select('*, users:created_by(id, name)')
    if (!error && newAct?.[0]) {
      setActivities((prev) => [newAct[0] as ActivityWithUser, ...prev])
    }
  }

  const handleSaveCore = async () => {
    setCoreError('')
    if (!editName.trim()) {
      setCoreError('Nama Lengkap wajib diisi.')
      return
    }
    const cleanPhone = normalizePhone(editPhone)
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      setCoreError('Nomor WhatsApp tidak valid.')
      return
    }

    setSaving(true)
    const { data, error } = await supabase.rpc('update_lead_core_fast_v2', {
      p_lead_id: lead.id,
      p_full_name: editName,
      p_whatsapp_number: cleanPhone,
      p_email: null,
      p_source_campaign: editSource,
      p_current_status: editStatus,
      p_assigned_cro_id: lead.assigned_cro_id || null,
      p_notes: editNotes || null,
      p_lost_reason: LOST_STATUSES.includes(editStatus) ? editLostReason : null,
    })
    setSaving(false)

    if (error) {
      setCoreError(error.message || 'Gagal menyimpan.')
      return
    }
    if (!data?.ok) {
      setCoreError(friendlyDuplicateError(data))
      return
    }

    const actorId = (await supabase.auth.getUser()).data.user?.id || null
    const updatedAt = new Date().toISOString()
    setLead({
      ...lead,
      full_name: editName,
      whatsapp_number: cleanPhone,
      whatsapp_normalized: cleanPhone,
      source_campaign: editSource,
      current_status: editStatus,
      notes: editNotes || null,
      lost_reason: LOST_STATUSES.includes(editStatus) ? editLostReason || null : null,
      updated_at: updatedAt,
      updated_by: actorId,
    })
    setEditPhone(cleanPhone)
    setIsEditingCore(false)
    await logActivity('Lead Updated', `Data lead diperbarui → ${editStatus}`, actorId)
  }

  const openPaymentForm = (payment?: PaymentRow) => {
    setPaymentError('')
    setEditingPayment(payment || null)
    setPaymentType(payment?.payment_type || 'pemetaan')
    setPaymentAmount(payment ? String(Number(payment.amount || 0)) : '')
    setPaymentDate(payment?.payment_date?.split('T')[0] || new Date().toISOString().split('T')[0])
    setPaymentMethod(payment?.payment_method || 'Transfer')
    setPaymentStatus(payment?.verification_status || 'verified')
    setPaymentNotes(payment?.notes || '')
    setIsEditingPayment(true)
  }

  const handleSavePayment = async () => {
    setPaymentError('')
    const nominal = Number(paymentAmount.replace(/[^\d]/g, ''))
    if (!paymentType) {
      setPaymentError('Tipe pembayaran wajib dipilih.')
      return
    }
    if (!nominal || nominal <= 0) {
      setPaymentError('Nominal pembayaran wajib diisi.')
      return
    }

    setSavingPayment(true)
    const actorId = (await supabase.auth.getUser()).data.user?.id || null
    const payload = {
      lead_id: lead.id,
      payment_type: paymentType,
      amount: nominal,
      payment_method: paymentMethod || 'Transfer',
      payment_date: paymentDate,
      verification_status: paymentStatus,
      verified_by: paymentStatus === 'verified' ? actorId : null,
      verified_at: paymentStatus === 'verified' ? new Date().toISOString() : null,
      notes: paymentNotes || null,
      updated_at: new Date().toISOString(),
    }

    const result = editingPayment
      ? await supabase.from('payments').update(payload).eq('id', editingPayment.id).select('*').single()
      : await supabase.from('payments').insert(payload).select('*').single()

    setSavingPayment(false)
    if (result.error) {
      setPaymentError(result.error.message || 'Gagal menyimpan pembayaran.')
      return
    }

    const savedPayment = result.data as PaymentRow
    setPayments((prev) =>
      editingPayment
        ? prev.map((payment) => (payment.id === savedPayment.id ? savedPayment : payment))
        : [savedPayment, ...prev]
    )
    setIsEditingPayment(false)
    await logActivity(
      editingPayment ? 'Payment Updated' : 'Payment Added',
      `${editingPayment ? 'Pembayaran diperbarui' : 'Pembayaran dicatat'}: ${paymentType} ${formatRupiah(nominal)}`,
      actorId
    )
  }

  const handleDeletePayment = async (payment: PaymentRow) => {
    const ok = window.confirm(`Hapus pembayaran ${formatRupiah(Number(payment.amount || 0))}? Data lead tidak ikut terhapus.`)
    if (!ok) return
    const actorId = (await supabase.auth.getUser()).data.user?.id || null
    const { error } = await supabase.from('payments').delete().eq('id', payment.id)
    if (error) {
      setPaymentError(error.message || 'Gagal menghapus pembayaran.')
      return
    }
    setPayments((prev) => prev.filter((item) => item.id !== payment.id))
    await logActivity('Payment Deleted', `Pembayaran dihapus: ${payment.payment_type} ${formatRupiah(Number(payment.amount || 0))}`, actorId)
  }

  const userLabel = (user?: UserSummary | null, fallback?: string | null) => {
    if (user?.name) return user.name
    if (fallback) {
      const found = pics.find((p) => p.id === fallback)
      if (found) return found.name
    }
    return 'Sistem'
  }

  return (
    <div className="w-full p-4 sm:p-6 space-y-4">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-secondary text-primary border border-border flex items-center justify-center font-display text-lg font-semibold flex-shrink-0">
              {lead.full_name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground truncate">
                {lead.full_name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{lead.whatsapp_number}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Campaign: {lead.source_campaign || '—'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Last update:{' '}
                <span className="font-semibold text-foreground">
                  {lead.updated_by_user?.name || pics.find((p) => p.id === lead.updated_by)?.name || '—'}
                </span>
                {' · '}
                {lead.updated_at
                  ? new Date(lead.updated_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={cn('text-[10px] px-2 py-0.5 rounded-md', getStageBadgeClasses(lead.current_status))}>
                  {LANE_LABEL[lane]}
                </span>
                <span className="text-[10px] text-muted-foreground">{displayStatus(lead.current_status)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {lane === 'stage1' && (
              <Link
                href={`/stage-1?lead=${lead.id}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90"
              >
                <ClipboardCheck size={14} />
                Kerjakan Stage 1
              </Link>
            )}
            {lane === 'stage2' && (
              <Link
                href="/stage-2"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90"
              >
                <ListChecks size={14} />
                Buka Stage 2
              </Link>
            )}
            {lane === 'stage3' && (
              <Link
                href="/stage-3"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90"
              >
                <KanbanSquare size={14} />
                Buka Stage 3
              </Link>
            )}
            <button
              type="button"
              onClick={() => setIsEditingCore(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-border bg-secondary text-foreground hover:bg-secondary/80"
            >
              <Edit size={14} />
              Edit data
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Posisi di alur PRD</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Leads → Stage 1 → Stage 2 → Stage 3.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <InfoCard label="Lane" value={LANE_LABEL[lane]} />
          <InfoCard label="Status" value={displayStatus(lead.current_status)} />
        </div>
        {lead.funnel_notes && (
          <div className="mt-4 rounded-xl border border-border bg-secondary/40 px-4 py-3">
            <p className="text-[11px] font-semibold text-muted-foreground">Catatan terakhir</p>
            <p className="text-xs text-foreground mt-1 leading-relaxed">{lead.funnel_notes}</p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="flex items-center gap-2">
            <DollarSign size={15} className="text-emerald-600" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Riwayat pembayaran</h2>
              <p className="text-xs text-muted-foreground">Ledger transaksi. Bisa ditambah atau dikoreksi tanpa mengubah stage.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openPaymentForm()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:opacity-90"
          >
            <Plus size={14} />
            Tambah pembayaran
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <InfoCard label="Total Pemetaan" value={formatRupiah(totalPemetaan)} />
          <InfoCard label="Total Seat Lock" value={formatRupiah(totalSeatLock)} />
        </div>

        {paymentError && (
          <div className="mb-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive">
            {paymentError}
          </div>
        )}

        {payments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
            Belum ada pembayaran tercatat.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Tipe</th>
                  <th className="px-3 py-2 font-semibold">Tanggal</th>
                  <th className="px-3 py-2 font-semibold">Nominal</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-2 font-semibold text-foreground">{payment.payment_type}</td>
                    <td className="px-3 py-2 text-muted-foreground">{payment.payment_date}</td>
                    <td className="px-3 py-2 font-semibold text-foreground">{formatRupiah(Number(payment.amount || 0))}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        {payment.verification_status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openPaymentForm(payment)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground"
                          title="Edit pembayaran"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeletePayment(payment)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                          title="Hapus pembayaran"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={15} className="text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Riwayat kontak & aktivitas CRO</h2>
        </div>
        {activities.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Belum ada aktivitas.</p>
        ) : (
          <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {activities.slice(0, 60).map((act) => (
              <li key={act.id} className="rounded-xl border border-border px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-foreground">{act.activity_type}</p>
                  <p className="text-[10px] text-muted-foreground flex-shrink-0">
                    {new Date(act.created_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{act.description}</p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  oleh{' '}
                  <span className="font-semibold text-foreground/80">
                    {userLabel(act.users, act.created_by)}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isEditingCore && (
        <div className="fixed inset-0 z-[200] bg-black/30">
          <div className="h-full w-full overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-foreground">Edit data lead</h3>
                  <button type="button" onClick={() => setIsEditingCore(false)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Nama</span>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="detail-input" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">WhatsApp</span>
                    <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="detail-input" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Campaign</span>
                    <input value={editSource} onChange={(e) => setEditSource(e.target.value)} className="detail-input" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Status</span>
                    <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="detail-input">
                      {[...new Set([...ALL_PRD_STATUSES, displayStatus(lead.current_status)])].map((status) => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {LOST_STATUSES.includes(editStatus) && (
                  <select value={editLostReason} onChange={(e) => setEditLostReason(e.target.value)} className="detail-input">
                    <option value="">Alasan lost...</option>
                    {LOST_REASON_OPTIONS.map((reason) => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                )}

                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Catatan..."
                  className="detail-input min-h-[72px]"
                />

                {coreError && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive">
                    {coreError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setCoreError('')
                      setIsEditingCore(false)
                    }}
                    className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleSaveCore}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-accent text-accent-foreground disabled:opacity-60"
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditingPayment && (
        <div className="fixed inset-0 z-[210] bg-black/30">
          <div className="h-full w-full overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    {editingPayment ? 'Edit pembayaran' : 'Tambah pembayaran'}
                  </h3>
                  <button type="button" onClick={() => setIsEditingPayment(false)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground">
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Tipe pembayaran</span>
                    <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="detail-input">
                      <option value="pemetaan">Pemetaan</option>
                      <option value="seat_lock">Seat Lock</option>
                      <option value="roadmap_session">Roadmap Session</option>
                    </select>
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Nominal</span>
                    <input
                      inputMode="numeric"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="500000"
                      className="detail-input"
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Tanggal bayar</span>
                    <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="detail-input" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Metode</span>
                    <input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="detail-input" />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">Status verifikasi</span>
                    <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="detail-input">
                      <option value="verified">Verified</option>
                      <option value="pending">Pending</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Catatan pembayaran..."
                    className="detail-input min-h-[72px]"
                  />
                </div>

                {paymentError && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive">
                    {paymentError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={() => setIsEditingPayment(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={savingPayment}
                    onClick={() => void handleSavePayment()}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-accent text-accent-foreground disabled:opacity-60"
                  >
                    {savingPayment && <Loader2 size={14} className="animate-spin" />}
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-1 truncate">{value}</p>
    </div>
  )
}

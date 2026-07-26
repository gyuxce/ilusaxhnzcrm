'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CheckCircle2, Loader2, Phone, User, Calendar, MessageSquare, Mail, TrendingUp, AlertCircle } from 'lucide-react'
import { LOST_REASON_OPTIONS, LOST_STATUSES } from '@/lib/lost-reasons'
import {
  STAGE1_CURRENT_STATUS_OPTIONS,
  STAGE2_ENTRY_STATUSES,
  STAGE3_STATUS_OPTIONS,
} from '@/lib/prd-stages'
import { parseRpcResult, type RpcResult } from '@/lib/rpc'
import { isJsonRecord } from '@/types/crm'
import { leadSchema, type LeadFormValues, normalizeWhatsApp } from '@/lib/validations/lead'
import { revalidateLeadsListing } from '@/app/actions/revalidate-leads'
import { readPrdTrialSinceClient } from '@/lib/prd-trial-mode'

interface LeadFormProps {
  pics: { id: string; name: string }[]
  defaultValues?: Partial<{
    whatsapp_number: string
    full_name: string
    email: string
    source_campaign: string
    lead_type: string
    current_status: string
    assigned_cro_id: string
    notes: string
    lead_entry_date: string
    referral_source: string
    whatsapp_normalized: string
    lost_reason: string
    lead_quality: string
    lead_segment: string
    entry_channel: string
    next_action: string
    next_follow_up_date: string
    funnel_notes: string
  }>
  leadId?: string
}

export function LeadForm({ pics, defaultValues, leadId }: LeadFormProps) {
  const router = useRouter()
  const isEditMode = Boolean(leadId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const {
    register,
    handleSubmit: handleFormSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      whatsapp_number: defaultValues?.whatsapp_number || '',
      full_name: defaultValues?.full_name || '',
      email: defaultValues?.email || '',
      source_campaign: defaultValues?.source_campaign || '',
      lead_type: (defaultValues?.lead_type as 'inbound' | 'outbound') || 'inbound',
      current_status: defaultValues?.current_status || 'New Lead',
      assigned_cro_id: defaultValues?.assigned_cro_id || '',
      notes: defaultValues?.notes || '',
      lead_entry_date: defaultValues?.lead_entry_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      lost_reason: defaultValues?.lost_reason || '',
      lead_quality: defaultValues?.lead_quality || '',
      lead_segment: defaultValues?.lead_segment || '',
      entry_channel: defaultValues?.entry_channel || 'Manual Input',
      next_action: defaultValues?.next_action || '',
      next_follow_up_date: defaultValues?.next_follow_up_date?.split('T')[0] || '',
      funnel_notes: defaultValues?.funnel_notes || '',
    },
  })

  const currentStatus = watch('current_status')

  function rpcErrorMessage(result: RpcResult | null | undefined, fallback = 'Terjadi kesalahan saat menyimpan lead.') {
    if (result?.duplicate_lead && isJsonRecord(result.duplicate_lead)) {
      const duplicate = result.duplicate_lead
      const trialHint = readPrdTrialSinceClient()
        ? ' Lead lama mungkin tersembunyi (mode uji) tapi nomor tetap terdaftar — pakai nomor WA lain.'
        : ''
      return `Nomor WhatsApp ini sudah terdaftar untuk ${duplicate.full_name} (${duplicate.source_campaign || 'tanpa campaign'}) dengan status ${duplicate.current_status || '-'}.${trialHint}`
    }
    return result?.message || fallback
  }

  async function onSubmit(dataValues: LeadFormValues) {
    const cleanPhone = normalizeWhatsApp(dataValues.whatsapp_number)

    setLoading(true)
    setError('')
    setSuccess('')

    const supabase = createClient()

    const params = {
      p_full_name: dataValues.full_name,
      p_whatsapp_number: cleanPhone,
      p_email: dataValues.email || null,
      p_source_campaign: dataValues.source_campaign || 'General',
      p_current_status: dataValues.current_status,
      p_assigned_cro_id: dataValues.assigned_cro_id || null,
      p_notes: dataValues.notes || null,
    }

    const { data, error: rpcErr } = leadId
      ? await supabase.rpc('update_lead_core_fast', {
          p_lead_id: leadId,
          ...params,
          p_lost_reason: LOST_STATUSES.includes(dataValues.current_status) ? dataValues.lost_reason : null,
          p_lead_entry_date: dataValues.lead_entry_date ? new Date(dataValues.lead_entry_date).toISOString() : null,
        })
      : await supabase.rpc('create_lead_fast', {
          ...params,
          p_lead_type: dataValues.lead_type,
          p_lead_entry_date: dataValues.lead_entry_date ? new Date(dataValues.lead_entry_date).toISOString() : new Date().toISOString(),
        })

    if (rpcErr) {
      setError(rpcErr.message || 'Terjadi kesalahan saat menyimpan lead.')
      setLoading(false)
      return
    }

    const result = parseRpcResult(data)
    if (!result?.ok) {
      setError(rpcErrorMessage(result))
      setLoading(false)
      return
    }

    setLoading(false)
    setSuccess(leadId ? 'Perubahan lead berhasil disimpan. Mengalihkan ke Data Leads...' : 'Lead baru berhasil ditambahkan. Mengalihkan ke menu Leads...')
    await revalidateLeadsListing()
    router.push('/leads')
    router.refresh()
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl text-sm text-foreground placeholder-muted-foreground/60 outline-none transition-all bg-card border border-border focus:ring-1 focus:ring-primary focus:border-primary"
  const inputStyle = {}

  const statusOptions = [...STAGE1_CURRENT_STATUS_OPTIONS, ...STAGE2_ENTRY_STATUSES, ...STAGE3_STATUS_OPTIONS, 'Not Interested', 'Not Eligible']

  return (
    <form onSubmit={handleFormSubmit(onSubmit)} className="space-y-6">
      {!isEditMode && (
        <div className="rounded-2xl border border-border bg-secondary/60 p-4">
          <h2 className="font-display text-base font-semibold tracking-tight text-foreground">Tambah Lead</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Isi nama, WhatsApp, dan campaign. Setelah simpan, lead masuk ke menu Leads (mode uji: hanya tampil jika mode uji sudah aktif sebelum simpan).
          </p>
        </div>
      )}

      {/* Section 1: Informasi Kontak */}
      <div className="bg-card text-card-foreground border border-border/80 p-5 rounded-2xl space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 mb-3">
          📞 Informasi Kontak
        </h3>

        {/* Nama Lengkap */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
            <User size={12} /> Nama Lengkap <span className="text-red-500">*</span>
          </label>
          <input
            {...register('full_name')}
            placeholder="Nama lengkap lead..."
            className={cn(inputClass, errors.full_name && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
            style={inputStyle}
          />
          {errors.full_name && (
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-red-500">
              <AlertCircle size={11} /> {errors.full_name.message}
            </p>
          )}
        </div>

        {/* WhatsApp & Email */}
        <div className={cn('grid grid-cols-1 gap-4', isEditMode && 'sm:grid-cols-2')}>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
              <Phone size={12} /> Nomor WhatsApp <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              {...register('whatsapp_number')}
              placeholder="Contoh: 08123456789"
              className={cn(inputClass, errors.whatsapp_number && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
              style={inputStyle}
            />
            {errors.whatsapp_number && (
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-red-500">
                <AlertCircle size={11} /> {errors.whatsapp_number.message}
              </p>
            )}
          </div>

          {isEditMode && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
                <Mail size={12} /> Alamat Email
              </label>
              <input
                type="email"
                {...register('email')}
                placeholder="nama@domain.com"
                className={cn(inputClass, errors.email && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
                style={inputStyle}
              />
              {errors.email && (
                <p className="mt-1 flex items-center gap-1 text-xs font-bold text-red-500">
                  <AlertCircle size={11} /> {errors.email.message}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Kampanye & PIC */}
      <div className="bg-card text-card-foreground border border-border/80 p-5 rounded-2xl space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 mb-3">
          📊 Kampanye & PIC
        </h3>

        {/* Source Campaign */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
            <TrendingUp size={12} /> Source Campaign <span className="text-red-500">*</span>
          </label>
          <input
            {...register('source_campaign')}
            placeholder="Contoh: Campaign Construction, Webinar Regular, Organic..."
            className={cn(inputClass, errors.source_campaign && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
            style={inputStyle}
          />
          {errors.source_campaign && (
            <p className="mt-1 flex items-center gap-1 text-xs font-bold text-red-500">
              <AlertCircle size={11} /> {errors.source_campaign.message}
            </p>
          )}
        </div>

        {/* PIC & Status */}
        <div className={cn('grid grid-cols-1 gap-4', isEditMode && 'sm:grid-cols-2')}>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2">PIC CRO</label>
            <select {...register('assigned_cro_id')} className={inputClass} style={inputStyle}>
              <option value="" className="bg-card text-foreground">Pilih PIC</option>
              {pics.map(p => <option key={p.id} value={p.id} className="bg-card text-foreground">{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2">Current Status</label>
            <select {...register('current_status')} className={inputClass} style={inputStyle}>
              {(isEditMode
                ? statusOptions
                : STAGE1_CURRENT_STATUS_OPTIONS
              ).map(s => <option key={s} value={s} className="bg-card text-foreground">{s}</option>)}
            </select>
          </div>
        </div>

        {LOST_STATUSES.includes(currentStatus || '') && (
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2">Kategori Alasan Penolakan <span className="text-red-500">*</span></label>
            <select
              {...register('lost_reason')}
              className={cn(inputClass, errors.lost_reason && 'border-red-500 focus:border-red-500 focus:ring-red-500')}
              style={inputStyle}
            >
              <option value="" className="bg-card text-foreground">Pilih kategori alasan...</option>
              {LOST_REASON_OPTIONS.map(reason => (
                <option key={reason} value={reason} className="bg-card text-foreground">{reason}</option>
              ))}
            </select>
            {errors.lost_reason && (
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-red-500">
                <AlertCircle size={11} /> {errors.lost_reason.message}
              </p>
            )}
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Dipakai untuk membaca pola penolakan dan menentukan strategi follow up berikutnya.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          Tipe lead: Inbound
        </div>
      </div>

      {/* Section 3: Catatan & Tanggal */}
      <div className="bg-card text-card-foreground border border-border/80 p-5 rounded-2xl space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 mb-3">
          📅 Catatan & Tanggal
        </h3>

        {/* Entry Date / Last Update */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
            <Calendar size={12} /> {isEditMode ? 'Tanggal Lead Masuk' : 'Last Update'}
          </label>
          <input
            type="date"
            {...register('lead_entry_date')}
            className={inputClass}
            style={inputStyle}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
            <MessageSquare size={12} /> Catatan Tambahan
          </label>
          <textarea
            {...register('notes')}
            placeholder="Tulis informasi tambahan atau kualifikasi awal..."
            rows={3}
            className={inputClass}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-xl text-sm bg-red-50 border border-red-100 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 font-bold flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-emerald-50 border border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300 font-bold">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 border border-border transition-all duration-150 cursor-pointer bg-card"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading || Boolean(success)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-accent-foreground bg-accent hover:opacity-90 transition-opacity disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {success ? 'Berhasil Disimpan' : loading ? 'Menyimpan...' : leadId ? 'Simpan Perubahan' : 'Tambah Lead'}
        </button>
      </div>

      {loading && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground shadow-2xl">
          <Loader2 size={16} className="animate-spin text-primary" />
          Menyimpan lead...
        </div>
      )}
    </form>
  )
}

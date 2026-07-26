'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CheckCircle2, Loader2, Phone, User, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react'
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
import { markLeadsListNeedsRefresh } from '@/lib/leads-list-refresh'

interface LeadFormProps {
  pics?: { id: string; name: string }[]
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
    lost_reason: string
  }>
  leadId?: string
}

const EDIT_STATUS_OPTIONS = [
  ...STAGE1_CURRENT_STATUS_OPTIONS,
  ...STAGE2_ENTRY_STATUSES,
  ...STAGE3_STATUS_OPTIONS,
  'Not Interested',
  'Not Eligible',
  'Cold Leads',
  'Failed',
]

export function LeadForm({ defaultValues, leadId }: LeadFormProps) {
  const router = useRouter()
  const isEditMode = Boolean(leadId)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const {
    register,
    handleSubmit: handleFormSubmit,
    watch,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      whatsapp_number: defaultValues?.whatsapp_number || '',
      full_name: defaultValues?.full_name || '',
      email: defaultValues?.email || '',
      source_campaign: defaultValues?.source_campaign || '',
      lead_type: 'inbound',
      current_status: defaultValues?.current_status || 'Input Manual',
      assigned_cro_id: '',
      notes: defaultValues?.notes || '',
      lead_entry_date: defaultValues?.lead_entry_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      lost_reason: defaultValues?.lost_reason || '',
      entry_channel: 'Manual Input',
    },
  })

  const currentStatus = watch('current_status')

  function rpcErrorMessage(result: RpcResult | null | undefined, fallback = 'Terjadi kesalahan saat menyimpan lead.') {
    if (result?.duplicate_lead && isJsonRecord(result.duplicate_lead)) {
      const duplicate = result.duplicate_lead
      return `Nomor WhatsApp ini sudah terdaftar untuk ${duplicate.full_name} (${duplicate.source_campaign || 'tanpa campaign'}) dengan status ${duplicate.current_status || '-'}.`
    }
    return result?.message || fallback
  }

  async function onSubmit(dataValues: LeadFormValues) {
    const cleanPhone = normalizeWhatsApp(dataValues.whatsapp_number)
    setLoading(true)
    setError('')
    setSuccess('')

    const supabase = createClient()
    const status = isEditMode ? dataValues.current_status : 'Input Manual'
    const params = {
      p_full_name: dataValues.full_name,
      p_whatsapp_number: cleanPhone,
      p_email: null,
      p_source_campaign: dataValues.source_campaign || 'WhatsApp Manual',
      p_current_status: status,
      p_assigned_cro_id: null,
      p_notes: dataValues.notes || null,
    }

    const { data, error: rpcErr } = leadId
      ? await supabase.rpc('update_lead_core_fast', {
          p_lead_id: leadId,
          ...params,
          p_lost_reason: LOST_STATUSES.includes(status) ? dataValues.lost_reason : null,
          p_lead_entry_date: dataValues.lead_entry_date ? new Date(dataValues.lead_entry_date).toISOString() : null,
        })
      : await supabase.rpc('create_lead_fast', {
          ...params,
          p_lead_type: 'inbound',
          p_lead_entry_date: new Date().toISOString(),
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
    setSuccess(leadId ? 'Perubahan tersimpan. Mengalihkan...' : 'Lead tersimpan. Mengalihkan ke Leads...')
    markLeadsListNeedsRefresh()

    const targetLeadId = leadId || result?.id || null
    if (targetLeadId) {
      const { data: auth } = await supabase.auth.getUser()
      await supabase.from('lead_activities').insert({
        lead_id: targetLeadId,
        activity_type: leadId ? 'Lead Updated' : 'Lead Created',
        description: leadId
          ? `Data lead diperbarui → ${status}`
          : `Lead input manual dari WA (${dataValues.full_name})`,
        created_by: auth.user?.id || null,
      })
    }

    await revalidateLeadsListing()
    if (leadId) {
      router.push(`/leads/${leadId}`)
      router.refresh()
      return
    }
    window.location.assign('/leads')
  }

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-xl text-sm text-foreground placeholder-muted-foreground/60 outline-none bg-card border border-border focus:ring-1 focus:ring-primary focus:border-primary'

  return (
    <form onSubmit={handleFormSubmit(onSubmit)} className="mx-auto max-w-xl space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
            {isEditMode ? 'Edit Lead' : 'Tambah Lead Manual'}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {isEditMode
              ? 'Perbarui data lead sesuai alur PRD V3.'
              : 'Untuk lead dari WhatsApp. Status otomatis: Input Manual. Import CSV memakai Bridging/Pitching.'}
          </p>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
            <User size={12} /> Nama Lengkap <span className="text-red-500">*</span>
          </label>
          <input
            {...register('full_name')}
            placeholder="Nama lead..."
            className={cn(inputClass, errors.full_name && 'border-red-500')}
          />
          {errors.full_name && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-500">
              <AlertCircle size={11} /> {errors.full_name.message}
            </p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
            <Phone size={12} /> Nomor WhatsApp <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            {...register('whatsapp_number')}
            placeholder="08123456789"
            className={cn(inputClass, errors.whatsapp_number && 'border-red-500')}
          />
          {errors.whatsapp_number && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-500">
              <AlertCircle size={11} /> {errors.whatsapp_number.message}
            </p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
            <TrendingUp size={12} /> Source Campaign <span className="text-red-500">*</span>
          </label>
          <input
            {...register('source_campaign')}
            placeholder="Contoh: WhatsApp Organic, Campaign Construction..."
            className={cn(inputClass, errors.source_campaign && 'border-red-500')}
          />
          {errors.source_campaign && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-500">
              <AlertCircle size={11} /> {errors.source_campaign.message || 'Campaign wajib diisi'}
            </p>
          )}
        </div>

        {isEditMode ? (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Current Status</label>
            <select {...register('current_status')} className={inputClass}>
              {EDIT_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-secondary/50 px-3.5 py-2.5 text-xs">
            <span className="text-muted-foreground">Status: </span>
            <span className="font-semibold text-foreground">Input Manual</span>
            <span className="text-muted-foreground"> · dari WhatsApp / input manual</span>
          </div>
        )}

        {isEditMode && LOST_STATUSES.includes(currentStatus || '') && (
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
              Alasan penolakan <span className="text-red-500">*</span>
            </label>
            <select
              {...register('lost_reason')}
              className={cn(inputClass, errors.lost_reason && 'border-red-500')}
            >
              <option value="">Pilih alasan...</option>
              {LOST_REASON_OPTIONS.map((reason) => (
                <option key={reason} value={reason}>{reason}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-1.5">
            <MessageSquare size={12} /> Catatan (opsional)
          </label>
          <textarea
            {...register('notes')}
            placeholder="Catatan singkat..."
            rows={3}
            className={cn(inputClass, 'resize-none')}
          />
        </div>
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-xl text-sm bg-red-50 border border-red-100 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 font-semibold flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm bg-emerald-50 border border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300 font-semibold">
          <CheckCircle2 size={16} />
          {success}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push('/leads')}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground border border-border bg-card"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading || Boolean(success)}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-accent-foreground bg-accent hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-1.5"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {success ? 'Tersimpan' : loading ? 'Menyimpan...' : leadId ? 'Simpan' : 'Tambah Lead'}
        </button>
      </div>
    </form>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CheckCircle2, Loader2, Phone, User, Calendar, MessageSquare, Mail, TrendingUp } from 'lucide-react'
import { LOST_REASON_OPTIONS, LOST_STATUSES } from '@/lib/lost-reasons'
import {
  FUNNEL_STATUS_OPTIONS,
} from '@/lib/funnel-framework'

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
  const [form, setForm] = useState({
    whatsapp_number: defaultValues?.whatsapp_number || '',
    full_name: defaultValues?.full_name || '',
    email: defaultValues?.email || '',
    source_campaign: defaultValues?.source_campaign || '',
    lead_type: defaultValues?.lead_type || 'inbound',
    current_status: defaultValues?.current_status || 'New Lead',
    assigned_cro_id: defaultValues?.assigned_cro_id || '',
    notes: defaultValues?.notes || '',
    lead_entry_date: defaultValues?.lead_entry_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    referral_source: defaultValues?.referral_source || '',
    lost_reason: defaultValues?.lost_reason || '',
    lead_quality: defaultValues?.lead_quality || '',
    lead_segment: defaultValues?.lead_segment || '',
    entry_channel: defaultValues?.entry_channel || 'Manual Input',
    next_action: defaultValues?.next_action || '',
    next_follow_up_date: defaultValues?.next_follow_up_date?.split('T')[0] || '',
    funnel_notes: defaultValues?.funnel_notes || '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function normalizePhone(value: string) {
    let cleanPhone = value.replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1)
    } else if (cleanPhone.startsWith('8')) {
      cleanPhone = '62' + cleanPhone
    }
    return cleanPhone
  }

  function rpcErrorMessage(result: any, fallback = 'Terjadi kesalahan saat menyimpan lead.') {
    if (result?.duplicate_lead) {
      const duplicate = result.duplicate_lead
      return `Nomor WhatsApp ini sudah terdaftar untuk ${duplicate.full_name} (${duplicate.source_campaign || 'tanpa campaign'}) dengan status ${duplicate.current_status || '-'}. Buka data existing dari menu Leads.`
    }
    return result?.message || fallback
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.whatsapp_number) return setError('Nomor WhatsApp wajib diisi')
    
    const cleanPhone = normalizePhone(form.whatsapp_number)

    // Validate phone number digits
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      return setError('Nomor WhatsApp tidak valid (harus antara 9 sampai 15 digit angka)')
    }

    if (!form.full_name) return setError('Nama Lengkap wajib diisi')
    if (!form.source_campaign) return setError('Source Campaign wajib diisi')

    setLoading(true)
    setError('')
    setSuccess('')

    const supabase = createClient()

    const params = {
      p_full_name: form.full_name,
      p_whatsapp_number: cleanPhone,
      p_email: form.email || null,
      p_source_campaign: form.source_campaign,
      p_current_status: form.current_status,
      p_assigned_cro_id: form.assigned_cro_id || null,
      p_notes: form.notes || null,
    }

    const { data, error: rpcErr } = leadId
      ? await supabase.rpc('update_lead_core_fast', {
          p_lead_id: leadId,
          ...params,
          p_lost_reason: LOST_STATUSES.includes(form.current_status) ? form.lost_reason : null,
          p_lead_entry_date: form.lead_entry_date ? new Date(form.lead_entry_date).toISOString() : null,
        })
      : await supabase.rpc('create_lead_fast', {
          ...params,
          p_lead_type: form.lead_type,
          p_lead_entry_date: form.lead_entry_date ? new Date(form.lead_entry_date).toISOString() : new Date().toISOString(),
        })

    if (rpcErr) {
      setError(rpcErr.message || 'Terjadi kesalahan saat menyimpan lead.')
      setLoading(false)
      return
    }

    if (!data?.ok) {
      setError(rpcErrorMessage(data))
      setLoading(false)
      return
    }

    setLoading(false)
    setSuccess(leadId ? 'Perubahan lead berhasil disimpan. Mengalihkan ke Data Leads...' : 'Lead baru berhasil ditambahkan. Mengalihkan ke Kerjaan Hari Ini untuk mulai dikerjakan...')
    setTimeout(() => {
      router.push(leadId ? '/leads' : '/work-queue?filter=new')
    }, 250)
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl text-sm text-foreground placeholder-muted-foreground/60 outline-none transition-all bg-card border border-border focus:ring-1 focus:ring-primary focus:border-primary"
  const inputStyle = {}

  const statusOptions = FUNNEL_STATUS_OPTIONS

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isEditMode && (
        <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <h2 className="text-sm font-extrabold text-foreground">Quick Add Lead</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Untuk input manual dari ads cukup isi nama, WhatsApp, dan campaign. Setelah simpan, lead langsung masuk ke Kerjaan Hari Ini untuk dihubungi dan dicatat hasil chat-nya.
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
            value={form.full_name}
            onChange={e => update('full_name', e.target.value)}
            placeholder="Nama lengkap lead..."
            required
            className={inputClass}
            style={inputStyle}
          />
        </div>

        {/* WhatsApp & Email */}
        <div className={cn('grid grid-cols-1 gap-4', isEditMode && 'sm:grid-cols-2')}>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
              <Phone size={12} /> Nomor WhatsApp <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={form.whatsapp_number}
              onChange={e => update('whatsapp_number', e.target.value.replace(/\D/g, ''))}
              placeholder="Contoh: 08123456789"
              required
              className={inputClass}
              style={inputStyle}
            />
          </div>

          {isEditMode && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
                <Mail size={12} /> Alamat Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="nama@domain.com"
                className={inputClass}
                style={inputStyle}
              />
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
            value={form.source_campaign}
            onChange={e => update('source_campaign', e.target.value)}
            placeholder="Contoh: Campaign Construction, Webinar Regular, Organic..."
            required
            className={inputClass}
            style={inputStyle}
          />
        </div>

        {/* PIC & Status */}
        <div className={cn('grid grid-cols-1 gap-4', isEditMode && 'sm:grid-cols-2')}>
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2">PIC CRO</label>
            <select value={form.assigned_cro_id} onChange={e => update('assigned_cro_id', e.target.value)} className={inputClass} style={inputStyle}>
              <option value="" className="bg-card text-foreground">Pilih PIC</option>
              {pics.map(p => <option key={p.id} value={p.id} className="bg-card text-foreground">{p.name}</option>)}
            </select>
          </div>

          {isEditMode && (
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-2">Status Pipeline</label>
              <select value={form.current_status} onChange={e => update('current_status', e.target.value)} className={inputClass} style={inputStyle}>
                {statusOptions.map(s => <option key={s} value={s} className="bg-card text-foreground">{s}</option>)}
              </select>
            </div>
          )}
        </div>

        {LOST_STATUSES.includes(form.current_status) && (
          <div>
            <label className="block text-xs font-bold text-muted-foreground mb-2">Kategori Alasan Penolakan</label>
            <select
              value={form.lost_reason}
              onChange={e => update('lost_reason', e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              <option value="" className="bg-card text-foreground">Pilih kategori alasan...</option>
              {LOST_REASON_OPTIONS.map(reason => (
                <option key={reason} value={reason} className="bg-card text-foreground">{reason}</option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Dipakai untuk membaca pola penolakan dan menentukan strategi follow up berikutnya.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
          Tipe lead: Inbound
        </div>

        {/* Lead Type */}
        <div className="hidden">
          <label className="block text-xs font-bold text-muted-foreground mb-2">Tipe Lead</label>
          <div className="flex gap-2">
            {[
              { value: 'inbound', label: '📥 Inbound', desc: 'Lead yang datang sendiri (submit form, DM, dll)' },
              { value: 'outbound', label: '📤 Outbound', desc: 'Lead yang dicari/dihubungi tim CRO' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update('lead_type', opt.value)}
                className={cn(
                  'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-left border transition-all cursor-pointer',
                  form.lead_type === opt.value
                    ? opt.value === 'inbound'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'bg-card border-border text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 3: Catatan & Tanggal */}
      <div className="bg-card text-card-foreground border border-border/80 p-5 rounded-2xl space-y-4 shadow-xs">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider border-b border-border pb-2 mb-3">
          📅 Catatan & Tanggal
        </h3>

        {/* Entry Date */}
        {isEditMode && (
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
              <Calendar size={12} /> Tanggal Lead Masuk
            </label>
            <input
              type="date"
              value={form.lead_entry_date}
              onChange={e => update('lead_entry_date', e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
            <MessageSquare size={12} /> Catatan Tambahan
          </label>
          <textarea
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            placeholder="Tulis informasi tambahan atau kualifikasi awal..."
            rows={3}
            className={inputClass}
            style={{ ...inputStyle, resize: 'none' }}
          />
        </div>
      </div>

      {error && (
        <div className="px-4 py-2.5 rounded-xl text-sm bg-red-50 border border-red-100 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400 font-bold">
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
          className="flex-1 py-2.5 rounded-xl text-sm font-extrabold text-primary-foreground bg-primary hover:opacity-90 transition-all disabled:opacity-60 cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
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

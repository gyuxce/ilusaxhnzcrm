'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Phone, User, Calendar, MessageSquare, Mail, Settings } from 'lucide-react'

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
  }>
  leadId?: string
}

export function LeadForm({ pics, defaultValues, leadId }: LeadFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.whatsapp_number) return setError('Nomor WhatsApp wajib diisi')
    if (!form.full_name) return setError('Nama Lengkap wajib diisi')
    if (!form.source_campaign) return setError('Source Campaign wajib diisi')

    setLoading(true)
    setError('')

    const supabase = createClient()
    
    // Standardise phone number format (remove non-digits, replace leading 0 or 8 with 62)
    let cleanPhone = form.whatsapp_number.replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1)
    } else if (cleanPhone.startsWith('8')) {
      cleanPhone = '62' + cleanPhone
    }

    const payload = {
      whatsapp_number: cleanPhone,
      full_name: form.full_name,
      email: form.email || null,
      source_campaign: form.source_campaign,
      lead_type: form.lead_type,
      current_status: form.current_status,
      assigned_cro_id: form.assigned_cro_id || null,
      notes: form.notes || null,
      lead_entry_date: form.lead_entry_date ? new Date(form.lead_entry_date).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    let err
    if (leadId) {
      const { error: updateErr } = await supabase.from('leads').update(payload).eq('id', leadId)
      err = updateErr
    } else {
      const { data: newLeads, error: insertErr } = await supabase.from('leads').insert({
        ...payload,
        created_at: new Date().toISOString()
      }).select()
      
      err = insertErr

      if (!err && newLeads && newLeads.length > 0) {
        // Initialise associated pemetaan record
        await supabase.from('pemetaan').insert({
          lead_id: newLeads[0].id,
          form_status: 'not_sent',
          result_status: 'not_ready'
        })

        // Log initial activity
        await supabase.from('lead_activities').insert({
          lead_id: newLeads[0].id,
          activity_type: 'Lead created',
          description: 'Lead created manually via Tambah Lead form'
        })
      }
    }

    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      router.push('/leads')
      router.refresh()
    }
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl text-sm text-foreground placeholder-muted-foreground/60 outline-none transition-all bg-card border border-border focus:ring-1 focus:ring-primary focus:border-primary"
  const inputStyle = {}

  const statusOptions = [
    'New Lead', 'Follow Up', 'Pitching', 'Interested', 'Not Interested',
    'Payment Pemetaan Pending', 'Payment Pemetaan Paid', 'Pemetaan Form Submitted',
    'Pemetaan Scheduled', 'Pemetaan Done', 'Waiting Result', 'Result Ready',
    'Expert Consultation Scheduled', 'Expert Consultation Done', 'Seat Lock Offered',
    'Seat Lock Paid', 'Onboarding', 'Class Started'
  ]

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-5 border border-border">

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
            <Phone size={12} /> Nomor WhatsApp <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={form.whatsapp_number}
            onChange={e => update('whatsapp_number', e.target.value)}
            placeholder="Contoh: 08123456789"
            required
            className={inputClass}
            style={inputStyle}
          />
        </div>

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
      </div>

      {/* Source Campaign & Referral */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
            <Users size={12} /> Nomor/Nama Referensi
          </label>
          <input
            value={form.referral_source || ''}
            onChange={e => update('referral_source', e.target.value)}
            placeholder="Kosongkan jika tidak ada referensi"
            className={inputClass}
            style={inputStyle}
          />
        </div>
      </div>

      {/* Lead Type */}
      <div>
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
                'flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-left border transition-all',
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

      {/* PIC & Status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-2">PIC CRO</label>
          <select value={form.assigned_cro_id} onChange={e => update('assigned_cro_id', e.target.value)} className={inputClass} style={inputStyle}>
            <option value="">Pilih PIC</option>
            {pics.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-muted-foreground mb-2">Status Pipeline</label>
          <select value={form.current_status} onChange={e => update('current_status', e.target.value)} className={inputClass} style={inputStyle}>
            {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Entry Date */}
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

      {error && (
        <div
          className="px-4 py-2.5 rounded-xl text-sm text-red-600 dark:text-red-400 font-bold border"
          style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }}
        >
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5 border border-border transition-all duration-150 cursor-pointer"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-extrabold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 cursor-pointer hover:glow-purple"
          style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Menyimpan...' : leadId ? 'Simpan Perubahan' : 'Tambah Lead'}
        </button>
      </div>
    </form>
  )
}

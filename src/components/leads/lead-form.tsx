'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Phone, User, Calendar, MessageSquare } from 'lucide-react'
import type { LeadSource, LeadType, LeadStage } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface LeadFormProps {
  pics: { id: string; full_name: string }[]
  campaigns: { id: string; name: string }[]
  defaultValues?: Partial<{
    phone_number: string
    name: string
    source: LeadSource
    lead_type: LeadType
    stage: LeadStage
    pic_id: string
    campaign_id: string
    notes: string
    age: number
    education: string
    inbound_date: string
  }>
  leadId?: string
}

export function LeadForm({ pics, campaigns, defaultValues, leadId }: LeadFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    phone_number: defaultValues?.phone_number || '',
    name: defaultValues?.name || '',
    source: defaultValues?.source || 'ig' as LeadSource,
    lead_type: defaultValues?.lead_type || 'inbound' as LeadType,
    stage: defaultValues?.stage || 'new' as LeadStage,
    pic_id: defaultValues?.pic_id || '',
    campaign_id: defaultValues?.campaign_id || '',
    notes: defaultValues?.notes || '',
    age: defaultValues?.age?.toString() || '',
    education: defaultValues?.education || '',
    inbound_date: defaultValues?.inbound_date?.split('T')[0] || new Date().toISOString().split('T')[0],
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.phone_number) return setError('Nomor HP wajib diisi')

    setLoading(true)
    setError('')

    const supabase = createClient()
    const payload = {
      phone_number: form.phone_number.replace(/\D/g, ''),
      name: form.name || null,
      source: form.source,
      lead_type: form.lead_type,
      stage: form.stage,
      pic_id: form.pic_id || null,
      campaign_id: form.campaign_id || null,
      notes: form.notes || null,
      age: form.age ? parseInt(form.age) : null,
      education: form.education || null,
      inbound_date: form.inbound_date ? new Date(form.inbound_date).toISOString() : null,
    }

    let error
    if (leadId) {
      ({ error } = await supabase.from('leads').update(payload).eq('id', leadId))
    } else {
      ({ error } = await supabase.from('leads').insert(payload))
    }

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/leads')
      router.refresh()
    }
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all"
  const inputStyle = { background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-5">

      {/* Lead Type Toggle */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-2">Tipe Lead</label>
        <div className="flex gap-2">
          {(['inbound', 'outbound'] as LeadType[]).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => update('lead_type', type)}
              className={cn(
                'flex-1 py-2 rounded-xl text-sm font-medium transition-all capitalize',
                form.lead_type === type
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/60'
              )}
              style={form.lead_type === type
                ? { background: 'linear-gradient(135deg, hsl(250,84%,55%), hsl(280,60%,50%))' }
                : { background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }
              }
            >
              {type === 'inbound' ? '📥 Inbound' : '📤 Outbound'}
            </button>
          ))}
        </div>
      </div>

      {/* Phone Number */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-white/50 mb-2">
          <Phone size={12} /> Nomor HP <span className="text-red-400">*</span>
        </label>
        <input
          value={form.phone_number}
          onChange={e => update('phone_number', e.target.value)}
          placeholder="628xxxxxxxxx"
          required
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Name */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-white/50 mb-2">
          <User size={12} /> Nama
        </label>
        <input
          value={form.name}
          onChange={e => update('name', e.target.value)}
          placeholder="Nama lengkap lead"
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Source + Stage */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2">Source</label>
          <select value={form.source} onChange={e => update('source', e.target.value)} className={inputClass} style={inputStyle}>
            {[
              { v: 'ig', l: '📸 Instagram' },
              { v: 'fb', l: '📘 Facebook' },
              { v: 'linkedin', l: '💼 LinkedIn' },
              { v: 'webinar', l: '🎓 Webinar' },
              { v: 'manual', l: '✍️ Manual' },
              { v: 'referral', l: '🤝 Referral' },
              { v: 'other', l: '📌 Lainnya' },
            ].map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/50 mb-2">Stage</label>
          <select value={form.stage} onChange={e => update('stage', e.target.value)} className={inputClass} style={inputStyle}>
            {[
              { v: 'new', l: 'Baru' },
              { v: 'probing', l: 'Probing' },
              { v: 'hot', l: '🔥 Hot Lead' },
              { v: 'potential', l: 'Potensial' },
              { v: 'converted', l: '✅ Konversi' },
              { v: 'rejected', l: 'Reject' },
            ].map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
      </div>

      {/* PIC + Campaign */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2">PIC</label>
          <select value={form.pic_id} onChange={e => update('pic_id', e.target.value)} className={inputClass} style={inputStyle}>
            <option value="">Pilih PIC</option>
            {pics.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/50 mb-2">Campaign</label>
          <select value={form.campaign_id} onChange={e => update('campaign_id', e.target.value)} className={inputClass} style={inputStyle}>
            <option value="">Pilih Campaign</option>
            {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Age + Education */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-white/50 mb-2">Usia</label>
          <input
            type="number"
            value={form.age}
            onChange={e => update('age', e.target.value)}
            placeholder="35"
            min="17" max="99"
            className={inputClass}
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-white/50 mb-2">Pendidikan</label>
          <select value={form.education} onChange={e => update('education', e.target.value)} className={inputClass} style={inputStyle}>
            <option value="">Pilih pendidikan</option>
            {['SMA/SMK', 'D1', 'D2', 'D3', 'S1', 'S2', 'S3'].map(e => (
              <option key={e} value={e.toLowerCase()}>{e}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-white/50 mb-2">
          <Calendar size={12} /> Tanggal Inbound
        </label>
        <input
          type="date"
          value={form.inbound_date}
          onChange={e => update('inbound_date', e.target.value)}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-medium text-white/50 mb-2">
          <MessageSquare size={12} /> Catatan
        </label>
        <textarea
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          placeholder="Catatan tambahan tentang lead ini..."
          rows={3}
          className={inputClass}
          style={{ ...inputStyle, resize: 'none' }}
        />
      </div>

      {error && (
        <div
          className="px-4 py-2.5 rounded-xl text-sm text-red-400"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white/80 transition-all"
          style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Menyimpan...' : leadId ? 'Simpan Perubahan' : 'Tambah Lead'}
        </button>
      </div>
    </form>
  )
}

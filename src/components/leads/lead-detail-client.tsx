'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MessageCircle, Clock, Calendar, CheckCircle2,
  XCircle, Edit, DollarSign, Activity, FileText,
  UserCheck, AlertCircle, Trash2, ArrowRight
} from 'lucide-react'
import { WhatsAppModal } from './WhatsAppModal'
import { cn } from '@/lib/utils'

interface LeadDetailClientProps {
  initialLead: any
  initialPayments: any[]
  initialPemetaan: any[]
  initialExpertConsultations: any[]
  initialActivities: any[]
  pics: any[]
}

export function LeadDetailClient({
  initialLead,
  initialPayments,
  initialPemetaan,
  initialExpertConsultations,
  initialActivities,
  pics
}: LeadDetailClientProps) {
  const [lead, setLead] = useState(initialLead)
  const [payments, setPayments] = useState(initialPayments)
  const [pemetaan, setPemetaan] = useState(initialPemetaan[0] || null)
  const [expert, setExpert] = useState(initialExpertConsultations[0] || null)
  const [activities, setActivities] = useState(initialActivities)
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'pemetaan' | 'expert'>('overview')
  
  // WhatsApp Modal
  const [isWaOpen, setIsWaOpen] = useState(false)
  
  // Edit State
  const [isEditingCore, setIsEditingCore] = useState(false)
  const [editName, setEditName] = useState(lead.full_name)
  const [editPhone, setEditPhone] = useState(lead.whatsapp_number)
  const [editEmail, setEditEmail] = useState(lead.email || '')
  const [editSource, setEditSource] = useState(lead.source_campaign)
  const [editStatus, setEditStatus] = useState(lead.current_status)
  const [editPic, setEditPic] = useState(lead.assigned_cro_id || '')
  const [editNotes, setEditNotes] = useState(lead.notes || '')
  const [editLostReason, setEditLostReason] = useState(lead.lost_reason || '')

  // Form States
  const [paymentType, setPaymentType] = useState('pemetaan')
  const [paymentAmount, setPaymentAmount] = useState('150000')
  const [paymentMethod, setPaymentMethod] = useState('Transfer')
  const [paymentNotes, setPaymentNotes] = useState('')
  
  // Pemetaan form states
  const [formStatus, setFormStatus] = useState(pemetaan?.form_status || 'not_sent')
  const [resultStatus, setResultStatus] = useState(pemetaan?.result_status || 'not_ready')
  const [resultNotes, setResultNotes] = useState(pemetaan?.result_notes || '')
  const [scheduledAt, setScheduledAt] = useState(pemetaan?.scheduled_at ? pemetaan.scheduled_at.slice(0, 16) : '')

  // Expert form states
  const [expertName, setExpertName] = useState(expert?.expert_name || '')
  const [expertScheduled, setExpertScheduled] = useState(expert?.scheduled_at ? expert.scheduled_at.slice(0, 16) : '')
  const [consultResult, setConsultResult] = useState(expert?.consultation_result || '')
  const [consultRecommend, setConsultRecommend] = useState(expert?.recommendation || '')
  const [consultNext, setConsultNext] = useState(expert?.next_step || '')

  const supabase = createClient()

  // Log Activity Helper
  const logActivity = async (type: string, desc: string) => {
    const { data: newAct, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: lead.id,
        activity_type: type,
        description: desc
      })
      .select()
    if (!error && newAct) {
      setActivities(prev => [newAct[0], ...prev])
    }
  }

  // Save Core Lead Data
  const handleSaveCore = async () => {
    const { error } = await supabase
      .from('leads')
      .update({
        full_name: editName,
        whatsapp_number: editPhone,
        email: editEmail || null,
        source_campaign: editSource,
        current_status: editStatus,
        assigned_cro_id: editPic || null,
        notes: editNotes || null,
        lost_reason: editStatus === 'Not Interested' ? editLostReason : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', lead.id)

    if (!error) {
      const updatedLead = {
        ...lead,
        full_name: editName,
        whatsapp_number: editPhone,
        email: editEmail || null,
        source_campaign: editSource,
        current_status: editStatus,
        assigned_cro_id: editPic || null,
        notes: editNotes || null,
        lost_reason: editStatus === 'Not Interested' ? editLostReason : null
      }
      setLead(updatedLead)
      setIsEditingCore(false)
      logActivity('Lead Updated', 'Core lead information updated manually')
    }
  }

  // Add Payment
  const handleAddPayment = async () => {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        lead_id: lead.id,
        payment_type: paymentType,
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        payment_date: new Date().toISOString().split('T')[0],
        verification_status: 'verified', // automatically verify for manual add
        verified_at: new Date().toISOString(),
        notes: paymentNotes
      })
      .select()

    if (!error && data) {
      setPayments(prev => [...prev, data[0]])
      setPaymentNotes('')
      logActivity('Payment Added', `Added ${paymentType} payment: Rp ${Number(paymentAmount).toLocaleString('id-ID')}`)
    }
  }

  // Save Pemetaan
  const handleSavePemetaan = async () => {
    const fields = {
      form_status: formStatus,
      result_status: resultStatus,
      result_notes: resultNotes || null,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      updated_at: new Date().toISOString()
    }

    if (pemetaan) {
      const { error } = await supabase
        .from('pemetaan')
        .update(fields)
        .eq('id', pemetaan.id)
      if (!error) {
        setPemetaan({ ...pemetaan, ...fields })
        logActivity('Pemetaan Updated', 'Pemetaan status and results updated')
      }
    } else {
      const { data, error } = await supabase
        .from('pemetaan')
        .insert({ lead_id: lead.id, ...fields })
        .select()
      if (!error && data) {
        setPemetaan(data[0])
        logActivity('Pemetaan Created', 'Pemetaan module initialised')
      }
    }
  }

  // Save Expert Consultation
  const handleSaveExpert = async () => {
    const fields = {
      expert_name: expertName || null,
      scheduled_at: expertScheduled ? new Date(expertScheduled).toISOString() : null,
      consultation_result: consultResult || null,
      recommendation: consultRecommend || null,
      next_step: consultNext || null,
      updated_at: new Date().toISOString()
    }

    if (expert) {
      const { error } = await supabase
        .from('expert_consultations')
        .update(fields)
        .eq('id', expert.id)
      if (!error) {
        setExpert({ ...expert, ...fields })
        logActivity('Expert Consultation Updated', 'Expert consultation details updated')
      }
    } else {
      const { data, error } = await supabase
        .from('expert_consultations')
        .insert({ lead_id: lead.id, ...fields })
        .select()
      if (!error && data) {
        setExpert(data[0])
        logActivity('Expert Consultation Created', 'Expert consultation module initialised')
      }
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner: Name & Quick WA Link */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 glass-card rounded-2xl border border-border relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-650 dark:text-purple-400 flex items-center justify-center font-bold text-xl glow-purple border border-purple-500/10">
            {lead.full_name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">{lead.full_name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{lead.whatsapp_number} | PIC: {pics.find(p => p.id === lead.assigned_cro_id)?.name || 'Belum di-assign'}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/20 text-purple-650 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30">
                {lead.current_status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsWaOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-450 hover:bg-emerald-500/20 transition-all cursor-pointer"
          >
            <MessageCircle size={14} />
            Hubungi via WA
          </button>
          <button
            onClick={() => setIsEditingCore(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-white/70 bg-slate-100 dark:bg-white/5 border border-border hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all cursor-pointer"
          >
            <Edit size={14} />
            Edit Profile
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-border w-fit">
        {[
          { id: 'overview', label: 'Overview & Timeline', icon: Activity },
          { id: 'payments', label: 'Payments', icon: DollarSign },
          { id: 'pemetaan', label: 'Pemetaan', icon: FileText },
          { id: 'expert', label: 'Expert Consultation', icon: UserCheck }
        ].map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                active ? "bg-purple-500 text-white shadow-lg glow-purple" : "text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-white/5"
              )}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Tab Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="glass-card rounded-2xl p-6 border border-border space-y-6">
              <h3 className="text-foreground font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-purple-650 dark:text-purple-400" />
                Detail Informasi Lead
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Nama Lengkap', value: lead.full_name },
                  { label: 'WhatsApp', value: lead.whatsapp_number },
                  { label: 'Email', value: lead.email || '-' },
                  { label: 'Source Campaign', value: lead.source_campaign },
                  { label: 'Status Pipeline', value: lead.current_status },
                  { label: 'Lost Reason', value: lead.lost_reason || '-' },
                  { label: 'Tanggal Masuk', value: new Date(lead.lead_entry_date).toLocaleString('id-ID') },
                  { label: 'Terakhir Dihubungi', value: lead.last_contacted_date ? new Date(lead.last_contacted_date).toLocaleString('id-ID') : '-' }
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl border border-border bg-slate-50/50 dark:bg-white/[0.01]">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">{item.label}</span>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white/80 mt-1">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-white/[0.01]">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Catatan / Keterangan</span>
                <p className="text-xs text-slate-700 dark:text-white/60 mt-2 leading-relaxed whitespace-pre-wrap">{lead.notes || 'Tidak ada catatan.'}</p>
              </div>
            </div>
          )}

          {/* Tab 2: Payments */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Payment Log */}
              <div className="glass-card rounded-2xl p-6 border border-border space-y-4">
                <h3 className="text-foreground font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
                  Riwayat Pembayaran
                </h3>

                <div className="space-y-3">
                  {payments.length === 0 ? (
                    <p className="text-muted-foreground/50 text-xs text-center py-6">Belum ada catatan pembayaran.</p>
                  ) : (
                    payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-white/[0.01]">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-foreground uppercase">{p.payment_type}</span>
                          <p className="text-[10px] text-muted-foreground">Tanggal: {p.payment_date} | Metode: {p.payment_method}</p>
                          {p.notes && <p className="text-[11px] text-muted-foreground italic">Catatan: {p.notes}</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">Rp {Number(p.amount).toLocaleString('id-ID')}</p>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                            VERIFIED
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add Payment Form */}
              <div className="glass-card rounded-2xl p-6 border border-border space-y-4">
                <h3 className="text-foreground font-bold text-xs uppercase tracking-wider">Catat Pembayaran Baru</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1">Tipe Pembayaran</label>
                    <select
                      value={paymentType}
                      onChange={e => setPaymentType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                    >
                      <option value="pemetaan">Pemetaan / Roadmap Session</option>
                      <option value="seat_lock">Seat Lock</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1">Nominal Pembayaran</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1">Catatan Tambahan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Transfer Bank BCA an. Budi..."
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <button
                  onClick={handleAddPayment}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white hover:glow-purple transition-all duration-300 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
                >
                  Simpan & Verifikasi Pembayaran
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Pemetaan */}
          {activeTab === 'pemetaan' && (
            <div className="glass-card rounded-2xl p-6 border border-border space-y-6">
              <h3 className="text-foreground font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-purple-650 dark:text-purple-400" />
                Modul Pemetaan / Roadmap Session
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Status Pengisian Form</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="not_sent">Belum Dikirim</option>
                    <option value="sent">Sudah Dikirim</option>
                    <option value="submitted">Sudah Diisi (Submitted)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Jadwal Pemetaan</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-4 border-t border-border">
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Status Hasil Pemetaan</label>
                  <select
                    value={resultStatus}
                    onChange={e => setResultStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="not_ready">Belum Siap</option>
                    <option value="waiting">Menunggu Hasil</option>
                    <option value="ready">Hasil Siap (Result Ready)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Catatan / Link Hasil Pemetaan</label>
                  <textarea
                    placeholder="Hasil pemetaan, rekomendasi jalur program, dll..."
                    value={resultNotes}
                    onChange={e => setResultNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none h-24 focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <button
                onClick={handleSavePemetaan}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white hover:glow-purple transition-all duration-300 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
              >
                Simpan Progress Pemetaan
              </button>
            </div>
          )}

          {/* Tab 4: Expert Consultation */}
          {activeTab === 'expert' && (
            <div className="glass-card rounded-2xl p-6 border border-border space-y-6">
              <h3 className="text-foreground font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <UserCheck size={16} className="text-purple-650 dark:text-purple-400" />
                Modul Konsultasi Expert
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Nama Expert / Konsultan</label>
                  <input
                    type="text"
                    placeholder="Nama expert..."
                    value={expertName}
                    onChange={e => setExpertName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Jadwal Konsultasi</label>
                  <input
                    type="datetime-local"
                    value={expertScheduled}
                    onChange={e => setExpertScheduled(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Hasil Konsultasi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Tertarik Jepang Regular, bersedia DP..."
                    value={consultResult}
                    onChange={e => setConsultResult(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Rekomendasi Jalur</label>
                  <input
                    type="text"
                    placeholder="Jalur Regular, Konstruksi, dll..."
                    value={consultRecommend}
                    onChange={e => setConsultRecommend(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Langkah Selanjutnya (Next Step)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Follow up seat lock nominal 3jt..."
                    value={consultNext}
                    onChange={e => setConsultNext(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveExpert}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white hover:glow-purple transition-all duration-300 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
              >
                Simpan Progress Konsultasi Expert
              </button>
            </div>
          )}

        </div>

        {/* Right 1 Column: Activity Log */}
        <div className="space-y-6">
          
          {/* Activity Log */}
          <div className="glass-card rounded-2xl p-5 border border-border space-y-4">
            <h3 className="text-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} className="text-purple-650 dark:text-purple-400" />
              Linimasa Aktivitas
            </h3>

            <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border max-h-[60vh] overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <p className="text-muted-foreground/50 text-[10px] py-4">Belum ada log aktivitas.</p>
              ) : (
                activities.map(act => (
                  <div key={act.id} className="relative space-y-0.5">
                    {/* circle marker */}
                    <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-slate-900" />
                    
                    <span className="text-[10px] text-muted-foreground/60 font-semibold uppercase">
                      {act.activity_type}
                    </span>
                    <p className="text-xs text-slate-750 dark:text-white/70">{act.description}</p>
                    <p className="text-[9px] text-muted-foreground/50">
                      {new Date(act.created_at).toLocaleString('id-ID')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={isWaOpen}
        onClose={() => setIsWaOpen(false)}
        leadName={lead.full_name}
        leadPhone={lead.whatsapp_number}
      />

      {/* Edit Profile Modal */}
      {isEditingCore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-foreground">Edit Data Utama Lead</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Source Campaign</label>
                <input
                  type="text"
                  value={editSource}
                  onChange={e => setEditSource(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Status Pipeline</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="New Lead">New Lead</option>
                  <option value="Follow Up">Follow Up</option>
                  <option value="Pitching">Pitching</option>
                  <option value="Interested">Interested</option>
                  <option value="Not Interested">Not Interested</option>
                  <option value="Payment Pemetaan Pending">Payment Pemetaan Pending</option>
                  <option value="Payment Pemetaan Paid">Payment Pemetaan Paid</option>
                  <option value="Pemetaan Form Submitted">Pemetaan Form Submitted</option>
                  <option value="Pemetaan Scheduled">Pemetaan Scheduled</option>
                  <option value="Pemetaan Done">Pemetaan Done</option>
                  <option value="Waiting Result">Waiting Result</option>
                  <option value="Result Ready">Result Ready</option>
                  <option value="Expert Consultation Scheduled">Expert Consultation Scheduled</option>
                  <option value="Expert Consultation Done">Expert Consultation Done</option>
                  <option value="Seat Lock Offered">Seat Lock Offered</option>
                  <option value="Seat Lock Paid">Seat Lock Paid</option>
                  <option value="Onboarding">Onboarding</option>
                  <option value="Class Started">Class Started</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">PIC CRO</label>
                <select
                  value={editPic}
                  onChange={e => setEditPic(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="">Belum di-assign</option>
                  {pics.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {editStatus === 'Not Interested' && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Alasan Lost / Drop-off</label>
                <select
                  value={editLostReason}
                  onChange={e => setEditLostReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="">Pilih Alasan...</option>
                  <option value="Financial constraint / kendala biaya">Financial constraint / kendala biaya</option>
                  <option value="Belum siap berangkat">Belum siap berangkat</option>
                  <option value="Perlu diskusi keluarga">Perlu diskusi keluarga</option>
                  <option value="Tidak memenuhi kualifikasi">Tidak memenuhi kualifikasi</option>
                  <option value="Tidak merespons">Tidak merespons</option>
                  <option value="Pilih program lain">Pilih program lain</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Catatan Tambahan</label>
              <textarea
                placeholder="Catatan bebas..."
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl h-20 focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              <button
                onClick={() => setIsEditingCore(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSaveCore}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white hover:glow-purple transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

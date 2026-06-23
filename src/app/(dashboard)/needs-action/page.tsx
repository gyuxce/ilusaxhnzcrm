'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  AlertCircle,
  MessageCircle,
  CheckCircle2,
  Calendar,
  UserCheck,
  Hourglass,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Search,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react'
import { WhatsAppModal } from '@/components/leads/WhatsAppModal'

interface LeadWithDetails {
  id: string
  full_name: string
  whatsapp_number: string
  email: string | null
  source_campaign: string
  current_status: string
  lead_entry_date: string
  last_contacted_date: string | null
  follow_up_result: string | null
  notes: string | null
  lost_reason: string | null
  assigned_cro_id: string | null
  users?: {
    name: string
  } | null
}

export default function NeedsActionPage() {
  const [leads, setLeads] = useState<LeadWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // WhatsApp Modal State
  const [isWaOpen, setIsWaOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<{ name: string; phone: string } | null>(null)
  
  // Quick Action Modal States
  const [actioningLead, setActioningLead] = useState<LeadWithDetails | null>(null)
  const [actionType, setActionType] = useState<string | null>(null) // 'submit_form', 'ready_result', 'schedule_expert', 'offer_seat_lock', 'pay_seat_lock'
  const [inputVal, setInputVal] = useState('')
  const [inputVal2, setInputVal2] = useState('') // e.g. for seat lock type
  
  const supabase = createClient()

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*, users:assigned_cro_id(name)')
      .in('current_status', [
        'Payment Pemetaan Paid',
        'Pemetaan Done',
        'Result Ready',
        'Expert Consultation Done',
        'Seat Lock Offered'
      ])
      .order('lead_entry_date', { ascending: false })

    if (!error && data) {
      setLeads(data as any[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Filter leads based on search query
  const filteredLeads = leads.filter(lead => 
    lead.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.whatsapp_number.includes(searchQuery) ||
    lead.source_campaign.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Categorize
  const paidButNoForm = filteredLeads.filter(l => l.current_status === 'Payment Pemetaan Paid')
  const pemetaanDoneWaiting = filteredLeads.filter(l => l.current_status === 'Pemetaan Done')
  const resultReadySchedule = filteredLeads.filter(l => l.current_status === 'Result Ready')
  const expertDoneFollowUp = filteredLeads.filter(l => l.current_status === 'Expert Consultation Done')
  const seatLockOfferedWaiting = filteredLeads.filter(l => l.current_status === 'Seat Lock Offered')

  // Open WA Modal
  const openWa = (lead: LeadWithDetails) => {
    setSelectedLead({ name: lead.full_name, phone: lead.whatsapp_number })
    setIsWaOpen(true)
  }

  // Handle lead status updates
  const handleUpdateStatus = async () => {
    if (!actioningLead || !actionType) return

    let nextStatus = ''
    let updateFields: Record<string, any> = {}
    let activityDesc = ''

    if (actionType === 'submit_form') {
      nextStatus = 'Pemetaan Form Submitted'
      activityDesc = 'Pemetaan Form Submitted marked via Needs Action dashboard'
      // Update associated pemetaan record if exists
      await supabase
        .from('pemetaan')
        .update({ form_status: 'submitted', updated_at: new Date().toISOString() })
        .eq('lead_id', actioningLead.id)
    } 
    else if (actionType === 'ready_result') {
      nextStatus = 'Result Ready'
      activityDesc = `Pemetaan result ready: ${inputVal}`
      await supabase
        .from('pemetaan')
        .update({ 
          result_status: 'ready', 
          result_ready_at: new Date().toISOString(),
          result_notes: inputVal,
          updated_at: new Date().toISOString()
        })
        .eq('lead_id', actioningLead.id)
    } 
    else if (actionType === 'schedule_expert') {
      nextStatus = 'Expert Consultation Scheduled'
      activityDesc = `Expert consultation scheduled for ${inputVal} with expert: ${inputVal2}`
      
      // Create or update expert consultation record
      const { data: ec } = await supabase
        .from('expert_consultations')
        .select('id')
        .eq('lead_id', actioningLead.id)
        .maybeSingle()

      if (ec) {
        await supabase
          .from('expert_consultations')
          .update({
            scheduled_at: new Date(inputVal).toISOString(),
            expert_name: inputVal2,
            updated_at: new Date().toISOString()
          })
          .eq('id', ec.id)
      } else {
        await supabase
          .from('expert_consultations')
          .insert({
            lead_id: actioningLead.id,
            scheduled_at: new Date(inputVal).toISOString(),
            expert_name: inputVal2
          })
      }
    } 
    else if (actionType === 'offer_seat_lock') {
      nextStatus = 'Seat Lock Offered'
      activityDesc = 'Seat Lock Offered'
    } 
    else if (actionType === 'pay_seat_lock') {
      nextStatus = 'Seat Lock Paid'
      activityDesc = `Seat lock paid: Rp ${Number(inputVal).toLocaleString('id-ID')} (${inputVal2})`
      
      // Insert Payment 2 record
      await supabase
        .from('payments')
        .insert({
          lead_id: actioningLead.id,
          payment_type: 'seat_lock',
          amount: Number(inputVal),
          payment_method: 'Transfer',
          payment_date: new Date().toISOString().split('T')[0],
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          notes: `Verified on Seat Lock Paid Action: ${inputVal2}`
        })
    }

    if (nextStatus) {
      updateFields.current_status = nextStatus
      updateFields.updated_at = new Date().toISOString()

      // Update lead
      const { error } = await supabase
        .from('leads')
        .update(updateFields)
        .eq('id', actioningLead.id)

      if (!error) {
        // Log Activity
        await supabase
          .from('lead_activities')
          .insert({
            lead_id: actioningLead.id,
            activity_type: 'Status changed',
            description: activityDesc
          })

        fetchLeads()
      }
    }

    // Reset action state
    setActioningLead(null)
    setActionType(null)
    setInputVal('')
    setInputVal2('')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Needs Action</h1>
          <p className="text-muted-foreground text-sm mt-1">Daftar leads yang membutuhkan tindakan follow-up segera berdasarkan status pipeline.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
            <input
              type="text"
              placeholder="Cari nama, WhatsApp, source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 rounded-xl text-sm bg-card text-foreground border border-border outline-none transition-all focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/60 dark:bg-slate-800/30 dark:border-white/10"
            />
          </div>
          <button 
            onClick={fetchLeads} 
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border dark:border-white/5 bg-card shadow-xs cursor-pointer"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {loading && leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw size={28} className="text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Memuat data leads...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Column 1: Paid but Form Pending */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
              <div className="flex items-center gap-2">
                <Hourglass size={15} className="text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-purple-900 dark:text-purple-100 text-xs uppercase tracking-wider">Paid, No Form</h3>
              </div>
              <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-xs px-2 py-0.5 rounded-full font-bold">{paidButNoForm.length}</span>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {paidButNoForm.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/45 text-xs rounded-xl border border-dashed border-border dark:border-white/5">Tidak ada leads</div>
              ) : (
                paidButNoForm.map(lead => (
                  <LeadActionCard 
                    key={lead.id} 
                    lead={lead} 
                    onWa={() => openWa(lead)}
                    onAction={() => {
                      setActioningLead(lead)
                      setActionType('submit_form')
                    }}
                    actionLabel="Form Submitted"
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 2: Pemetaan Done, Waiting Result */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
              <div className="flex items-center gap-2">
                <Clock size={15} className="text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-blue-900 dark:text-blue-100 text-xs uppercase tracking-wider">Waiting Result</h3>
              </div>
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full font-bold">{pemetaanDoneWaiting.length}</span>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {pemetaanDoneWaiting.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/45 text-xs rounded-xl border border-dashed border-border dark:border-white/5">Tidak ada leads</div>
              ) : (
                pemetaanDoneWaiting.map(lead => (
                  <LeadActionCard 
                    key={lead.id} 
                    lead={lead} 
                    onWa={() => openWa(lead)}
                    onAction={() => {
                      setActioningLead(lead)
                      setActionType('ready_result')
                    }}
                    actionLabel="Set Result Ready"
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 3: Result Ready, Schedule Expert */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-amber-600 dark:text-amber-400" />
                <h3 className="font-bold text-amber-900 dark:text-amber-100 text-xs uppercase tracking-wider">Schedule Expert</h3>
              </div>
              <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold">{resultReadySchedule.length}</span>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {resultReadySchedule.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/45 text-xs rounded-xl border border-dashed border-border dark:border-white/5">Tidak ada leads</div>
              ) : (
                resultReadySchedule.map(lead => (
                  <LeadActionCard 
                    key={lead.id} 
                    lead={lead} 
                    onWa={() => openWa(lead)}
                    onAction={() => {
                      setActioningLead(lead)
                      setActionType('schedule_expert')
                    }}
                    actionLabel="Schedule Expert"
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 4: Expert Done, Follow Up Seat Lock */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
              <div className="flex items-center gap-2">
                <UserCheck size={15} className="text-orange-600 dark:text-orange-400" />
                <h3 className="font-bold text-orange-900 dark:text-orange-100 text-xs uppercase tracking-wider">Offer Seat Lock</h3>
              </div>
              <span className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 text-xs px-2 py-0.5 rounded-full font-bold">{expertDoneFollowUp.length}</span>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {expertDoneFollowUp.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/45 text-xs rounded-xl border border-dashed border-border dark:border-white/5">Tidak ada leads</div>
              ) : (
                expertDoneFollowUp.map(lead => (
                  <LeadActionCard 
                    key={lead.id} 
                    lead={lead} 
                    onWa={() => openWa(lead)}
                    onAction={() => {
                      setActioningLead(lead)
                      setActionType('offer_seat_lock')
                    }}
                    actionLabel="Offer Seat Lock"
                  />
                ))
              )}
            </div>
          </div>

          {/* Column 5: Seat Lock Offered, Waiting Payment */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
              <div className="flex items-center gap-2">
                <FileCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-emerald-900 dark:text-emerald-100 text-xs uppercase tracking-wider">Waiting Payment</h3>
              </div>
              <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs px-2 py-0.5 rounded-full font-bold">{seatLockOfferedWaiting.length}</span>
            </div>
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {seatLockOfferedWaiting.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground/45 text-xs rounded-xl border border-dashed border-border dark:border-white/5">Tidak ada leads</div>
              ) : (
                seatLockOfferedWaiting.map(lead => (
                  <LeadActionCard 
                    key={lead.id} 
                    lead={lead} 
                    onWa={() => openWa(lead)}
                    onAction={() => {
                      setActioningLead(lead)
                      setActionType('pay_seat_lock')
                    }}
                    actionLabel="Seat Lock Paid"
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {selectedLead && (
        <WhatsAppModal
          isOpen={isWaOpen}
          onClose={() => setIsWaOpen(false)}
          leadName={selectedLead.name}
          leadPhone={selectedLead.phone}
        />
      )}

      {/* Action Modals */}
      {actioningLead && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-card text-card-foreground rounded-2xl p-6 border border-border dark:border-white/10 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-2">Tindak Lanjuti Lead</h3>
            <p className="text-muted-foreground text-xs mb-4">
              Konfirmasi perubahan status untuk lead <span className="text-primary font-semibold">{actioningLead.full_name}</span>.
            </p>

            {/* Inputs based on Action Type */}
            {actionType === 'submit_form' && (
              <p className="text-sm text-primary mb-6 bg-primary/10 p-3 rounded-xl border border-primary/20 font-medium">
                Tindakan ini akan memindahkan status lead menjadi <span className="font-bold">Pemetaan Form Submitted</span>.
              </p>
            )}

            {actionType === 'ready_result' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 font-semibold">Catatan Hasil Pemetaan</label>
                  <textarea
                    placeholder="Masukkan ringkasan hasil pemetaan..."
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background text-foreground border border-border rounded-xl h-24 outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            )}

            {actionType === 'schedule_expert' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 font-semibold">Tanggal Konsultasi Expert</label>
                  <input
                    type="datetime-local"
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background text-foreground border border-border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 font-semibold">Nama Expert</label>
                  <input
                    type="text"
                    placeholder="Nama expert/konsultan..."
                    value={inputVal2}
                    onChange={(e) => setInputVal2(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background text-foreground border border-border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>
            )}

            {actionType === 'offer_seat_lock' && (
              <p className="text-sm text-primary mb-6 bg-primary/10 p-3 rounded-xl border border-primary/20 font-medium">
                Tindakan ini akan memindahkan status lead menjadi <span className="font-bold">Seat Lock Offered</span>.
              </p>
            )}

            {actionType === 'pay_seat_lock' && (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 font-semibold">Nominal Pembayaran Seat Lock</label>
                  <select
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background text-foreground border border-border rounded-xl mb-3 cursor-pointer outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="" className="bg-card text-foreground">Pilih nominal...</option>
                    <option value="3000000" className="bg-card text-foreground">Rp 3.000.000 (Regular)</option>
                    <option value="5000000" className="bg-card text-foreground">Rp 5.000.000 (Construction)</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Atau masukkan nominal custom..."
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background text-foreground border border-border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 font-semibold">Tipe Seat Lock</label>
                  <select
                    value={inputVal2}
                    onChange={(e) => setInputVal2(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-background text-foreground border border-border rounded-xl cursor-pointer outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="Regular" className="bg-card text-foreground">Regular / Non-Construction</option>
                    <option value="Construction" className="bg-card text-foreground">Construction</option>
                  </select>
                </div>
              </div>
            )}

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-border dark:border-white/5 pt-4">
              <button
                onClick={() => {
                  setActioningLead(null)
                  setActionType(null)
                  setInputVal('')
                  setInputVal2('')
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={
                  (actionType === 'ready_result' && !inputVal) ||
                  (actionType === 'schedule_expert' && (!inputVal || !inputVal2)) ||
                  (actionType === 'pay_seat_lock' && !inputVal)
                }
                className="px-4 py-2 text-xs font-bold rounded-xl text-primary-foreground bg-primary disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all duration-300 shadow-xs cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface LeadActionCardProps {
  lead: LeadWithDetails
  onWa: () => void
  onAction: () => void
  actionLabel: string
}

function LeadActionCard({ lead, onWa, onAction, actionLabel }: LeadActionCardProps) {
  // Format Lead entry date
  const entryDate = new Date(lead.lead_entry_date)
  const formattedDate = entryDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: '2-digit'
  })

  return (
    <div 
      className="p-4 rounded-xl border border-border dark:border-white/5 space-y-3 transition-all hover:scale-[1.01] hover:border-border-hover dark:hover:border-white/10 bg-card text-card-foreground shadow-xs" 
    >
      <div>
        <h4 className="font-bold text-foreground text-sm line-clamp-1 leading-tight">{lead.full_name}</h4>
        <span className="text-muted-foreground/75 text-[10px] block mt-0.5">{lead.source_campaign}</span>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border dark:border-white/5">
        <span>Masuk: {formattedDate}</span>
        <span className="font-semibold text-primary">PIC: {lead.users?.name || 'Unassigned'}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          onClick={onWa}
          className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all border border-emerald-500/10 cursor-pointer"
        >
          <MessageCircle size={12} />
          Hubungi
        </button>
        <button
          onClick={onAction}
          className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-all border border-primary/10 cursor-pointer"
        >
          {actionLabel}
          <ArrowRight size={12} />
        </button>
      </div>
    </div>
  )
}

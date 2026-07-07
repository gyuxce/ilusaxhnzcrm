'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
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
  FileText,
  Search,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react'
import { WhatsAppModal } from '@/components/leads/WhatsAppModal'
import { Header } from '@/components/layout/header'
import { NEEDS_ACTION_STATUSES } from '@/lib/funnel-framework'
import { parseRpcResult } from '@/lib/rpc'
import type { NeedsActionLead, NeedsActionType } from '@/types/crm'

interface LeadWithDetails extends NeedsActionLead {}

const QUEUES = [
  { key: 'all', label: 'Semua', status: null, icon: AlertCircle, tone: 'text-slate-600 dark:text-slate-300' },
  { key: 'pemetaan', label: 'Pemetaan Scheduled', status: 'Pemetaan Scheduled', icon: Hourglass, tone: 'text-purple-600 dark:text-purple-400' },
  { key: 'waiting', label: 'Waiting Result', status: 'Waiting Result', icon: Clock, tone: 'text-blue-600 dark:text-blue-400' },
  { key: 'result_ready', label: 'Result Ready', status: 'Result Ready', icon: FileCheck, tone: 'text-cyan-600 dark:text-cyan-400' },
  { key: 'sent_result', label: 'Sent Result Pemetaan', status: 'Sent Result Pemetaan', icon: FileText, tone: 'text-emerald-600 dark:text-emerald-455' },
  { key: 'placement', label: 'Placement Test', status: 'Placement Test Scheduled', icon: FileCheck, tone: 'text-pink-600 dark:text-pink-400' },
  { key: 'expert', label: 'Expert Scheduled', status: 'Expert Consultation Scheduled', icon: Calendar, tone: 'text-amber-600 dark:text-amber-400' },
  { key: 'seat_lock', label: 'Offer Seat Lock', status: 'Seat Lock Offered', icon: UserCheck, tone: 'text-orange-600 dark:text-orange-400' },
  { key: 'closing_followup', label: 'Belum Closing', status: 'Belum Berhasil Closing', icon: TrendingUp, tone: 'text-red-600 dark:text-red-400' },
] as const

type QueueKey = typeof QUEUES[number]['key']

export default function NeedsActionPage() {
  const [leads, setLeads] = useState<LeadWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeQueue, setActiveQueue] = useState<QueueKey>('all')
  
  // WhatsApp Modal State
  const [isWaOpen, setIsWaOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<{ id?: string; name: string; phone: string } | null>(null)
  
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
      .in('current_status', NEEDS_ACTION_STATUSES)
      .order('lead_entry_date', { ascending: false })

    if (!error && data) {
      setLeads(data as NeedsActionLead[])
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

  const queueCounts = QUEUES.reduce((acc, queue) => {
    acc[queue.key] = queue.status
      ? filteredLeads.filter(lead => lead.current_status === queue.status).length
      : filteredLeads.length
    return acc
  }, {} as Record<QueueKey, number>)

  const activeQueueConfig = QUEUES.find(queue => queue.key === activeQueue) || QUEUES[0]
  const activeLeads = activeQueueConfig.status
    ? filteredLeads.filter(lead => lead.current_status === activeQueueConfig.status)
    : filteredLeads

  // Open WA Modal
  const openWa = (lead: LeadWithDetails) => {
    setSelectedLead({ id: lead.id, name: lead.full_name, phone: lead.whatsapp_number })
    setIsWaOpen(true)
  }

  const getActionForLead = (lead: LeadWithDetails) => {
    if (lead.current_status === 'Pemetaan Scheduled') {
      return { type: 'set_waiting_result', label: 'Set Waiting Result' }
    }
    if (lead.current_status === 'Waiting Result') {
      return { type: 'send_result', label: 'Kirim Hasil Pemetaan' }
    }
    if (lead.current_status === 'Result Ready') {
      return { type: 'schedule_expert', label: 'Schedule Expert' }
    }
    if (lead.current_status === 'Sent Result Pemetaan') {
      return { type: 'schedule_expert', label: 'Schedule Expert' }
    }
    if (lead.current_status === 'Placement Test Scheduled' || lead.current_status === 'Placement Test Done') {
      return { type: 'send_result', label: 'Kirim Hasil Pemetaan' }
    }
    if (lead.current_status === 'Expert Consultation Scheduled') {
      return { type: 'offer_seat_lock', label: 'Offer Seat Lock' }
    }
    if (lead.current_status === 'Seat Lock Offered') {
      return { type: 'pay_seat_lock', label: 'Seat Lock Paid' }
    }
    if (lead.current_status === 'Belum Berhasil Closing') {
      return { type: 'offer_seat_lock', label: 'Follow Up Closing' }
    }
    return null
  }

  const formatDate = (dateValue: string | null) => {
    if (!dateValue) return '-'
    return new Date(dateValue).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    })
  }

  // Handle lead status updates
  const handleUpdateStatus = async () => {
    if (!actioningLead || !actionType) return

    const { data, error } = await supabase.rpc('apply_needs_action_fast', {
      p_lead_id: actioningLead.id,
      p_action_type: actionType as NeedsActionType,
      p_input_val: inputVal || null,
      p_input_val2: inputVal2 || null,
    })

    if (error) {
      alert(`Gagal memperbarui lead: ${error.message}`)
      return
    }

    const result = parseRpcResult(data)
    if (!result?.ok) {
      alert(result?.message || 'Gagal memperbarui lead.')
      return
    }

    fetchLeads()

    setActioningLead(null)
    setActionType(null)
    setInputVal('')
    setInputVal2('')
  }

  return (
    <>
      <Header title="Needs Action" subtitle="Daftar leads yang membutuhkan tindakan follow-up segera berdasarkan status pipeline." />
      <div className="w-full p-6 space-y-6 animate-fade-in">
        
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} />
            <input
              type="text"
              placeholder="Cari nama, WhatsApp, source..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-card text-foreground border border-border outline-none transition-all focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/60 dark:bg-slate-800/30 dark:border-white/10"
            />
          </div>
          <button 
            onClick={fetchLeads} 
            className="self-start sm:self-auto p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/5 transition-all border border-border dark:border-white/5 bg-card shadow-xs cursor-pointer flex items-center justify-center"
            title="Muat Ulang"
          >
            <RefreshCw size={17} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

      {loading && leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw size={28} className="text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Memuat data leads...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {QUEUES.map(queue => {
              const Icon = queue.icon
              const active = activeQueue === queue.key
              return (
                <button
                  key={queue.key}
                  type="button"
                  onClick={() => setActiveQueue(queue.key)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                    active
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} className={active ? 'text-primary' : queue.tone} />
                  {queue.label}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-foreground">
                    {queueCounts[queue.key]}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-sm font-extrabold text-foreground uppercase tracking-wide">Work Queue</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Kerjakan lead prioritas dari atas ke bawah.</p>
              </div>
              <span className="text-xs text-muted-foreground">{activeLeads.length} leads</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-slate-50/60 text-[10px] uppercase tracking-wide text-muted-foreground dark:bg-white/[0.02]">
                    <th className="px-4 py-3 font-bold">Lead</th>
                    <th className="px-4 py-3 font-bold">Campaign</th>
                    <th className="px-4 py-3 font-bold">PIC</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Masuk</th>
                    <th className="px-4 py-3 font-bold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeLeads.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-14 text-center text-sm text-muted-foreground/50">
                        Tidak ada leads pada queue ini.
                      </td>
                    </tr>
                  ) : activeLeads.map(lead => {
                    const action = getActionForLead(lead)
                    return (
                      <tr key={lead.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <Link href={`/leads/${lead.id}`} className="font-extrabold text-foreground hover:text-primary">
                            {lead.full_name}
                          </Link>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{lead.whatsapp_number}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{lead.source_campaign}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-primary">{lead.users?.name || 'Unassigned'}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {lead.current_status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(lead.lead_entry_date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openWa(lead)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/15 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-600 transition-all hover:bg-emerald-500/20 dark:text-emerald-400"
                            >
                              <MessageCircle size={12} />
                              WA
                            </button>
                            {action && (
                              <button
                                onClick={() => {
                                  setActioningLead(lead)
                                  setActionType(action.type)
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-primary/15 bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary transition-all hover:bg-primary/20"
                              >
                                {action.label}
                                <ArrowRight size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
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
          leadId={selectedLead.id}
        />
      )}

      {/* Action Modals */}
      {actioningLead && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-card text-card-foreground rounded-2xl p-6 border border-border dark:border-white/10 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-2">Tindak Lanjuti Lead</h3>
            <p className="text-muted-foreground text-xs mb-4">
              Konfirmasi perubahan status untuk lead <span className="text-primary font-semibold">{actioningLead.full_name}</span>.
            </p>

            {/* Inputs based on Action Type */}
            {actionType === 'set_waiting_result' && (
              <p className="text-sm text-primary mb-6 bg-primary/10 p-3 rounded-xl border border-primary/20 font-medium">
                Tindakan ini akan memindahkan status lead menjadi <span className="font-bold">Waiting Result</span>.
              </p>
            )}

            {actionType === 'send_result' && (
              <div className="space-y-4 mb-6">
                <p className="text-sm text-primary bg-primary/10 p-3 rounded-xl border border-primary/20 font-medium">
                  Tindakan ini akan memindahkan status lead menjadi <span className="font-bold">Sent Result Pemetaan</span>.
                </p>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1 font-semibold">Catatan Hasil Pemetaan (opsional)</label>
                  <textarea
                    placeholder="Masukkan ringkasan hasil pemetaan..."
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm bg-background text-foreground border border-border rounded-xl resize-none outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
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
    </>
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

'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MessageCircle, CheckCircle2, Clock, AlertCircle,
  ChevronRight, Plus, Calendar, RefreshCw, Phone, Zap
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { WhatsAppModal } from '../leads/WhatsAppModal'
import { cn } from '@/lib/utils'

interface FUWithRelations {
  id: string
  lead_id: string
  fu_type: string
  scheduled_date: string
  notes: string | null
  is_done: boolean
  result: string | null
  leads: {
    id: string
    full_name: string
    whatsapp_number: string
    current_status: string
    source_campaign: string
  } | null
  users?: { name: string } | null
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  'New Lead': { color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
  'Interested': { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  'Payment Pemetaan Paid': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  'Pemetaan Done': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  'Expert Consultation Done': { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  'Seat Lock Paid': { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  'Not Interested': { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
}

const FU_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  chat: { label: '💬 Chat', color: '#3b82f6' },
  call: { label: '📞 Telepon', color: '#10b981' },
  whatsapp: { label: '🟢 WhatsApp', color: '#22c55e' },
  meeting: { label: '🤝 Meeting', color: '#f59e0b' },
}

interface FollowUpTrackerProps {
  dueFUs: FUWithRelations[]
  upcomingFUs: FUWithRelations[]
}

export function FollowUpTracker({ dueFUs: initialDueFUs, upcomingFUs: initialUpcoming }: FollowUpTrackerProps) {
  const [dueFUs, setDueFUs] = useState<FUWithRelations[]>(initialDueFUs)
  const [upcomingFUs] = useState<FUWithRelations[]>(initialUpcoming)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [resultInput, setResultInput] = useState('')
  const [waOpen, setWaOpen] = useState(false)
  const [waLead, setWaLead] = useState<{ name: string; phone: string } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newLeadId, setNewLeadId] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [newFuType, setNewFuType] = useState<'chat' | 'call' | 'whatsapp' | 'meeting'>('whatsapp')
  const [newNotes, setNewNotes] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const supabase = createClient()

  async function markDone(fu: FUWithRelations) {
    if (completingId === fu.id) {
      // Confirm with result
      await supabase.from('follow_ups').update({
        is_done: true,
        done_at: new Date().toISOString(),
        result: resultInput || 'Selesai',
        updated_at: new Date().toISOString(),
      }).eq('id', fu.id)
      setDueFUs(prev => prev.filter(f => f.id !== fu.id))
      setCompletingId(null)
      setResultInput('')
    } else {
      setCompletingId(fu.id)
      setResultInput('')
    }
  }

  const openWA = useCallback((lead: FUWithRelations['leads']) => {
    if (!lead) return
    setWaLead({ name: lead.full_name, phone: lead.whatsapp_number })
    setWaOpen(true)
  }, [])

  function FUCard({ fu, isOverdue }: { fu: FUWithRelations; isOverdue?: boolean }) {
    const isCompleting = completingId === fu.id
    const lead = fu.leads
    const statusStyle = STATUS_COLORS[lead?.current_status || ''] || { color: '#64748b', bg: 'rgba(100,116,139,0.1)' }
    const fuLabel = FU_TYPE_LABELS[fu.fu_type] || { label: fu.fu_type, color: '#64748b' }

    return (
      <div
        className={cn(
          'p-4 rounded-xl border space-y-3 transition-all duration-200',
          isOverdue && !isCompleting ? 'border-red-500/20' : 'border-white/5',
          isCompleting ? 'border-purple-500/25' : 'hover:border-white/10'
        )}
        style={{ background: isCompleting ? 'rgba(139,92,246,0.05)' : 'hsl(222,47%,9%)' }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/leads/${lead?.id}`} className="text-sm font-bold text-white hover:text-purple-300 transition-colors line-clamp-1">
              {lead?.full_name || 'Unknown Lead'}
            </Link>
            <p className="text-[10px] text-white/35 mt-0.5 truncate">{lead?.source_campaign}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isOverdue && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                OVERDUE
              </span>
            )}
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: statusStyle.bg, color: statusStyle.color }}>
              {lead?.current_status?.split(' ').slice(0, 2).join(' ') || '-'}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-[10px] text-white/40">
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            {new Date(fu.scheduled_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </span>
          <span style={{ color: fuLabel.color }}>{fuLabel.label}</span>
          {fu.users?.name && <span className="text-purple-400/70">• {fu.users.name.split(' ')[0]}</span>}
        </div>

        {fu.notes && (
          <p className="text-[10px] text-white/45 bg-white/[0.02] p-2 rounded-lg border border-white/5 line-clamp-2">
            {fu.notes}
          </p>
        )}

        {/* Complete with result */}
        {isCompleting && (
          <div className="space-y-2">
            <textarea
              placeholder="Tulis hasil follow-up... (opsional)"
              value={resultInput}
              onChange={e => setResultInput(e.target.value)}
              rows={2}
              className="w-full px-2.5 py-2 text-xs text-white placeholder-white/20 outline-none rounded-lg resize-none"
              style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => openWA(lead)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all border border-emerald-500/8"
          >
            <MessageCircle size={12} /> Hubungi
          </button>
          <button
            onClick={() => markDone(fu)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all border',
              isCompleting
                ? 'text-white border-purple-500/30 bg-purple-500/20 hover:bg-purple-500/30'
                : 'text-purple-400 border-purple-500/10 bg-purple-500/8 hover:bg-purple-500/15'
            )}
          >
            <CheckCircle2 size={12} />
            {isCompleting ? 'Konfirmasi Selesai' : 'Tandai Selesai'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Overdue / Hari Ini', count: dueFUs.length, color: '#ef4444', bg: 'rgba(239,68,68,0.08)', icon: AlertCircle },
          { label: 'Upcoming (Besok+)', count: upcomingFUs.length, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: Clock },
          { label: 'Total Dijadwalkan', count: dueFUs.length + upcomingFUs.length, color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', icon: Calendar },
        ].map(card => (
          <div key={card.label} className="glass-card rounded-2xl p-4 border border-white/5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: card.bg }}>
              <card.icon size={18} style={{ color: card.color }} />
            </div>
            <div>
              <p className="text-xl font-extrabold text-white">{card.count}</p>
              <p className="text-[10px] text-white/40">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
          <AlertCircle size={16} className="text-red-400" />
          Harus Diselesaikan Hari Ini
          {dueFUs.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
              {dueFUs.length}
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:glow-purple"
          style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
        >
          <Plus size={13} /> Jadwalkan FU
        </button>
      </div>

      {/* Due FUs */}
      {dueFUs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 glass-card rounded-2xl border border-white/5">
          <CheckCircle2 size={36} className="text-emerald-400" />
          <p className="text-white font-bold">Semua FU hari ini sudah selesai! 🎉</p>
          <p className="text-white/40 text-xs">Tidak ada follow-up yang tertunda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dueFUs.map(fu => <FUCard key={fu.id} fu={fu} isOverdue />)}
        </div>
      )}

      {/* Upcoming FUs */}
      {upcomingFUs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Clock size={16} className="text-blue-400" />
            Jadwal Mendatang
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold" style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>
              {upcomingFUs.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingFUs.slice(0, 12).map(fu => <FUCard key={fu.id} fu={fu} />)}
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {waLead && (
        <WhatsAppModal
          isOpen={waOpen}
          onClose={() => setWaOpen(false)}
          leadName={waLead.name}
          leadPhone={waLead.phone}
        />
      )}

      {/* Add FU Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md glass-card rounded-2xl p-6 border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Jadwalkan Follow-Up Baru</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-white/40 font-bold uppercase mb-1">ID Lead</label>
                <input
                  type="text"
                  placeholder="UUID lead..."
                  value={newLeadId}
                  onChange={e => setNewLeadId(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-white outline-none rounded-xl"
                  style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
                />
                <p className="text-[9px] text-white/25 mt-1">Buka detail lead dan salin ID dari URL</p>
              </div>
              <div>
                <label className="block text-[10px] text-white/40 font-bold uppercase mb-1">Tanggal FU</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-white outline-none rounded-xl"
                  style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 font-bold uppercase mb-1">Tipe FU</label>
                <select
                  value={newFuType}
                  onChange={e => setNewFuType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs text-white outline-none rounded-xl cursor-pointer"
                  style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
                >
                  <option value="whatsapp">🟢 WhatsApp</option>
                  <option value="chat">💬 Chat</option>
                  <option value="call">📞 Telepon</option>
                  <option value="meeting">🤝 Meeting</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-white/40 font-bold uppercase mb-1">Catatan (opsional)</label>
                <textarea
                  placeholder="Catatan untuk FU ini..."
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs text-white placeholder-white/20 outline-none rounded-xl resize-none"
                  style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs rounded-xl text-white/50 hover:text-white hover:bg-white/5 transition-all"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (!newLeadId || !newDate) return
                  await supabase.from('follow_ups').insert({
                    lead_id: newLeadId,
                    scheduled_date: newDate,
                    fu_type: newFuType,
                    notes: newNotes || null,
                  })
                  setShowAddModal(false)
                  setNewLeadId('')
                  setNewNotes('')
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white hover:glow-purple transition-all"
                style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
              >
                Simpan FU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

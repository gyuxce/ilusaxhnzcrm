'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import {
  MessageCircle, CheckCircle2, Clock, AlertCircle,
  ChevronRight, Plus, Calendar, RefreshCw, Phone, Zap
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { WhatsAppModal } from '../leads/WhatsAppModal'
import { cn, getTodayInWIB } from '@/lib/utils'

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
  'Pemetaan Scheduled': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  'Sent Result Pemetaan': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
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
  const [upcomingFUs, setUpcomingFUs] = useState<FUWithRelations[]>(initialUpcoming)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [resultInput, setResultInput] = useState('')
  const [waOpen, setWaOpen] = useState(false)
  const [waLead, setWaLead] = useState<{ id?: string; name: string; phone: string } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newLeadId, setNewLeadId] = useState('')
  const [newDate, setNewDate] = useState(getTodayInWIB())
  const [newFuType, setNewFuType] = useState<'chat' | 'call' | 'whatsapp' | 'meeting'>('whatsapp')
  const [newNotes, setNewNotes] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const supabase = createClient()

  async function markDone(fu: FUWithRelations) {
    if (completingId === fu.id) {
      const result = resultInput || 'Selesai'
      const { data: authData } = await supabase.auth.getUser()
      const actorId = authData.user?.id || null

      const { error: updateError } = await supabase.from('follow_ups').update({
        is_done: true,
        done_at: new Date().toISOString(),
        result: result,
        updated_at: new Date().toISOString(),
      }).eq('id', fu.id)

      if (updateError) {
        alert(`Gagal menandai follow-up selesai: ${updateError.message}`)
        return
      }

      const { error: activityError } = await supabase.from('lead_activities').insert({
        lead_id: fu.lead_id,
        activity_type: 'Follow-Up Completed',
        description: `Follow-up (${fu.fu_type || 'whatsapp'}) selesai: ${result}`,
        created_by: actorId
      })

      if (activityError) {
        console.error('Failed to log follow-up activity:', activityError)
      }

      await supabase.from('leads').update({
        updated_at: new Date().toISOString(),
        updated_by: actorId
      }).eq('id', fu.lead_id)

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
    setWaLead({ id: lead.id, name: lead.full_name, phone: lead.whatsapp_number })
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
          'p-4 rounded-xl border space-y-3 transition-all duration-200 bg-card text-card-foreground',
          isOverdue && !isCompleting ? 'border-red-500/20 bg-red-500/5' : 'border-border dark:border-white/5',
          isCompleting ? 'border-primary/25 bg-primary/5' : 'hover:border-border-hover dark:hover:border-white/10 hover:shadow-xs'
        )}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/leads/${lead?.id}`} className="text-sm font-bold text-foreground hover:text-primary transition-colors line-clamp-1">
              {lead?.full_name || 'Unknown Lead'}
            </Link>
            <p className="text-[10px] text-muted-foreground/80 mt-0.5 truncate">{lead?.source_campaign}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isOverdue && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                OVERDUE
              </span>
            )}
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: statusStyle.bg, color: statusStyle.color }}>
              {lead?.current_status?.split(' ').slice(0, 2).join(' ') || '-'}
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            {new Date(fu.scheduled_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </span>
          <span style={{ color: fuLabel.color }} className="font-semibold">{fuLabel.label}</span>
          {fu.users?.name && <span className="text-primary/70 dark:text-purple-400/70">• {fu.users.name.split(' ')[0]}</span>}
        </div>

        {fu.notes && (
          <p className="text-[10px] text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border/50 dark:border-white/5 line-clamp-2">
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
              className="w-full px-2.5 py-2 text-xs bg-background text-foreground border border-border rounded-lg resize-none outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => openWA(lead)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all border border-emerald-500/8"
          >
            <MessageCircle size={12} /> Hubungi
          </button>
          <button
            onClick={() => markDone(fu)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all border',
              isCompleting
                ? 'text-white border-primary/30 bg-primary hover:bg-primary/90'
                : 'text-primary border-primary/10 bg-primary/8 hover:bg-primary/15'
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
          { label: 'Total Dijadwalkan', count: dueFUs.length + upcomingFUs.length, color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', icon: Calendar },
        ].map(card => (
          <div key={card.label} className="bg-card text-card-foreground rounded-2xl p-4 border border-border dark:border-white/5 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: card.bg }}>
              <card.icon size={18} style={{ color: card.color }} />
            </div>
            <div>
              <p className="text-xl font-extrabold text-foreground">{card.count}</p>
              <p className="text-[10px] text-muted-foreground">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Action Row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500" />
          Harus Diselesaikan Hari Ini
          {dueFUs.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
              {dueFUs.length}
            </span>
          )}
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-primary-foreground bg-primary hover:opacity-90 transition-all shadow-sm"
        >
          <Plus size={13} /> Jadwalkan FU
        </button>
      </div>

      {/* Due FUs */}
      {dueFUs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-card border border-border dark:border-white/5 rounded-2xl shadow-xs">
          <CheckCircle2 size={36} className="text-emerald-500" />
          <p className="text-foreground font-bold">Semua FU hari ini sudah selesai! 🎉</p>
          <p className="text-muted-foreground text-xs">Tidak ada follow-up yang tertunda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {dueFUs.map(fu => <FUCard key={fu.id} fu={fu} isOverdue />)}
        </div>
      )}

      {/* Upcoming FUs */}
      {upcomingFUs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <Clock size={16} className="text-blue-500" />
            Jadwal Mendatang
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
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
          leadId={waLead.id}
        />
      )}

      {/* Add FU Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="w-full max-w-md bg-card text-card-foreground rounded-2xl p-6 border border-border dark:border-white/10 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-foreground">Jadwalkan Follow-Up Baru</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1">ID Lead</label>
                <input
                  type="text"
                  placeholder="UUID lead..."
                  value={newLeadId}
                  onChange={e => setNewLeadId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background text-foreground border border-border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
                <p className="text-[9px] text-muted-foreground/75 mt-1">Buka detail lead dan salin ID dari URL</p>
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1">Tanggal FU</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-background text-foreground border border-border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1">Tipe FU</label>
                <select
                  value={newFuType}
                  onChange={e => setNewFuType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-background text-foreground border border-border rounded-xl outline-none focus:ring-1 focus:ring-primary focus:border-primary cursor-pointer"
                >
                  <option value="whatsapp" className="bg-card text-foreground">🟢 WhatsApp</option>
                  <option value="chat" className="bg-card text-foreground">💬 Chat</option>
                  <option value="call" className="bg-card text-foreground">📞 Telepon</option>
                  <option value="meeting" className="bg-card text-foreground">🤝 Meeting</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1">Catatan (opsional)</label>
                <textarea
                  placeholder="Catatan untuk FU ini..."
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-background text-foreground border border-border rounded-xl resize-none outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-border dark:border-white/5 pt-4">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (!newLeadId || !newDate) return
                  const { data: authData } = await supabase.auth.getUser()
                  const actorId = authData.user?.id || null

                  const { data: inserted, error: insertError } = await supabase.from('follow_ups').insert({
                    lead_id: newLeadId,
                    scheduled_date: newDate,
                    fu_type: newFuType,
                    notes: newNotes || null,
                    pic_id: actorId,
                  }).select('*, leads(id, full_name, whatsapp_number, current_status, source_campaign), users:pic_id(name)').single()

                  if (insertError) {
                    alert(`Gagal menyimpan follow-up: ${insertError.message}`)
                    return
                  }

                  await supabase.from('lead_activities').insert({
                    lead_id: newLeadId,
                    activity_type: 'Follow-Up Scheduled',
                    description: `Jadwalkan follow-up (${newFuType}) untuk tanggal ${newDate}`,
                    created_by: actorId
                  })

                  await supabase.from('leads').update({
                    updated_at: new Date().toISOString(),
                    updated_by: actorId
                  }).eq('id', newLeadId)

                  const today = getTodayInWIB()
                  if (inserted) {
                    if (newDate <= today) {
                      setDueFUs(prev => [...prev, inserted as FUWithRelations])
                    } else {
                      setUpcomingFUs(prev => [...prev, inserted as FUWithRelations])
                    }
                  }

                  setShowAddModal(false)
                  setNewLeadId('')
                  setNewNotes('')
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl text-primary-foreground bg-primary hover:opacity-90 transition-all shadow-xs"
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

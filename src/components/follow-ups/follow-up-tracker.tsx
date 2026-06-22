'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageCircle, CheckCircle2, Clock, AlertCircle, ChevronRight } from 'lucide-react'
import { generateWALink, formatDate, FU_LABELS, SOURCE_LABELS } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { WhatsAppModal } from '../leads/WhatsAppModal'

const SOURCE_ICONS: Record<string, string> = {
  ig: '📸', fb: '📘', linkedin: '💼', webinar: '🎓', manual: '✍️', referral: '🤝', other: '📌'
}

const STAGE_COLORS: Record<string, string> = {
  new: '#64748b', probing: '#3b82f6', hot: '#f97316',
  potential: '#eab308', converted: '#22c55e', rejected: '#ef4444'
}
const STAGE_LABELS: Record<string, string> = {
  new: 'Baru', probing: 'Probing', hot: '🔥 Hot', potential: 'Potensial', converted: '✅ Konversi', rejected: 'Reject'
}

interface FUWithRelations {
  id: string
  lead_id: string
  fu_type: string
  scheduled_date: string | null
  is_done: boolean
  note: string | null
  status_message: string | null
  leads: { id: string; name: string | null; phone_number: string; stage: string; source: string } | null
  users: { full_name: string } | null
}

interface FollowUpTrackerProps {
  dueFUs: FUWithRelations[]
  upcomingFUs: FUWithRelations[]
}

export function FollowUpTracker({ dueFUs, upcomingFUs }: FollowUpTrackerProps) {
  const [done, setDone] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<string | null>(null)
  const [waModalOpen, setWaModalOpen] = useState(false)
  const [activeLead, setActiveLead] = useState<any>(null)

  async function markDone(fuId: string) {
    setLoading(fuId)
    const supabase = createClient()
    await supabase
      .from('follow_ups')
      .update({ is_done: true, actual_date: new Date().toISOString().split('T')[0] })
      .eq('id', fuId)
    setDone(prev => new Set([...prev, fuId]))
    setLoading(null)
  }

  function FUCard({ fu, isOverdue }: { fu: FUWithRelations; isOverdue?: boolean }) {
    const isDone = done.has(fu.id)
    const lead = fu.leads
    const stageColor = STAGE_COLORS[lead?.stage || 'new'] || '#64748b'

    return (
      <div
        className="flex items-center gap-4 p-4 rounded-xl transition-all group"
        style={{
          background: isDone
            ? 'rgba(34,197,94,0.05)'
            : isOverdue
              ? 'rgba(239,68,68,0.05)'
              : 'rgba(255,255,255,0.03)',
          border: isDone
            ? '1px solid rgba(34,197,94,0.15)'
            : isOverdue
              ? '1px solid rgba(239,68,68,0.15)'
              : '1px solid rgba(255,255,255,0.06)',
          opacity: isDone ? 0.6 : 1,
        }}
      >
        {/* Status icon */}
        <div className="flex-shrink-0">
          {isDone ? (
            <CheckCircle2 size={20} className="text-green-400" />
          ) : isOverdue ? (
            <AlertCircle size={20} className="text-red-400" />
          ) : (
            <Clock size={20} className="text-yellow-400" />
          )}
        </div>

        {/* Lead info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/leads/${lead?.id}`}
              className="text-sm font-semibold text-white hover:text-purple-300 transition-colors truncate"
            >
              {lead?.name || 'Tanpa Nama'}
            </Link>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
              style={{ background: `${stageColor}20`, color: stageColor }}
            >
              {STAGE_LABELS[lead?.stage || 'new']}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-white/40 font-mono">{lead?.phone_number}</span>
            <span className="text-xs text-white/30">•</span>
            <span className="text-xs text-white/40">
              {SOURCE_ICONS[lead?.source || 'other']} {(SOURCE_LABELS as any)[lead?.source || 'other'] || lead?.source}
            </span>
            <span className="text-xs text-white/30">•</span>
            <span className="text-xs text-purple-400 font-medium">{(FU_LABELS as any)[fu.fu_type] || fu.fu_type}</span>
          </div>
          {fu.note && <p className="text-xs text-white/30 mt-1 italic truncate">{fu.note}</p>}
        </div>

        {/* Date */}
        <div className="text-xs text-white/40 flex-shrink-0 hidden sm:block">
          {formatDate(fu.scheduled_date)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isDone && lead && (
            <button
              onClick={() => {
                setActiveLead(lead)
                setWaModalOpen(true)
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-500/15 transition-all duration-200"
              title="Kirim Template WA"
            >
              <MessageCircle size={15} />
            </button>
          )}
          {!isDone && (
            <button
              onClick={() => markDone(fu.id)}
              disabled={loading === fu.id}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
              style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <CheckCircle2 size={12} />
              {loading === fu.id ? '...' : 'Done'}
            </button>
          )}
          <Link href={`/leads/${lead?.id}`} className="text-white/30 hover:text-white/60 transition-colors">
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]
  const overdue = dueFUs.filter(fu => fu.scheduled_date && fu.scheduled_date < today && !done.has(fu.id))
  const todayFUs = dueFUs.filter(fu => fu.scheduled_date === today && !done.has(fu.id))
  const doneFUs = dueFUs.filter(fu => done.has(fu.id))

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Overdue', count: overdue.length, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
          { label: 'Hari Ini', count: todayFUs.length, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
          { label: 'Selesai', count: doneFUs.length + dueFUs.filter(f => f.is_done).length, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-2xl p-4 text-center" style={{ border: `1px solid ${s.color}20` }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</p>
            <p className="text-xs text-white/40 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-red-400 mb-3">
            <AlertCircle size={15} /> Overdue ({overdue.length})
          </h2>
          <div className="space-y-2">
            {overdue.map(fu => <FUCard key={fu.id} fu={fu} isOverdue />)}
          </div>
        </section>
      )}

      {/* Today */}
      {todayFUs.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-orange-400 mb-3">
            <Clock size={15} /> Hari Ini ({todayFUs.length})
          </h2>
          <div className="space-y-2">
            {todayFUs.map(fu => <FUCard key={fu.id} fu={fu} />)}
          </div>
        </section>
      )}

      {/* Upcoming */}
      {upcomingFUs.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white/50 mb-3">
            <Clock size={15} /> Mendatang ({upcomingFUs.length})
          </h2>
          <div className="space-y-2">
            {upcomingFUs.slice(0, 10).map(fu => <FUCard key={fu.id} fu={fu} />)}
          </div>
        </section>
      )}

      {dueFUs.length === 0 && upcomingFUs.length === 0 && (
        <div className="glass-card rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-white/60 font-medium">Semua follow-up sudah selesai!</p>
          <p className="text-sm text-white/30 mt-1">Tidak ada FU yang perlu dilakukan saat ini</p>
        </div>
      )}
      {activeLead && (
        <WhatsAppModal
          isOpen={waModalOpen}
          onClose={() => {
            setWaModalOpen(false)
            setActiveLead(null)
          }}
          leadName={activeLead.name || 'Tanpa Nama'}
          leadPhone={activeLead.phone_number}
        />
      )}
    </div>
  )
}

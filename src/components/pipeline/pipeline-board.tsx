'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, ExternalLink, GripVertical, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const STAGES = [
  { key: 'New Lead', label: 'New Lead', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.18)' },
  { key: 'Interested', label: 'Interested', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.18)' },
  { key: 'Payment Pemetaan Paid', label: '💰 Paid Pemetaan', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.18)' },
  { key: 'Pemetaan Done', label: '📋 Pemetaan Done', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)' },
  { key: 'Expert Consultation Done', label: '🧠 Expert Done', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)' },
  { key: 'Seat Lock Paid', label: '🔒 Seat Lock', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.18)' },
  { key: 'Not Interested', label: '❌ Not Interested', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)' },
]

const INITIAL_VISIBLE_PER_COLUMN = 12
const LOAD_MORE_STEP = 12

interface LeadCard {
  id: string
  full_name: string
  whatsapp_number: string
  source_campaign: string
  current_status: string
  lead_entry_date: string | null
  lead_type?: string
  notes: string | null
  assigned_cro_id: string | null
  users?: { id: string; name: string } | null
}

interface PipelineBoardProps {
  initialLeads: LeadCard[]
}

export function PipelineBoard({ initialLeads }: PipelineBoardProps) {
  const [leads, setLeads] = useState<LeadCard[]>(initialLeads)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({})

  const supabase = createClient()

  const filtered = searchQuery
    ? leads.filter(l =>
        l.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.source_campaign?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : leads

  function getLeadsByStage(stage: string) {
    return filtered.filter(l => l.current_status === stage)
  }

  function getVisibleCount(stage: string) {
    return visibleCounts[stage] || INITIAL_VISIBLE_PER_COLUMN
  }

  function loadMore(stage: string) {
    setVisibleCounts(prev => ({
      ...prev,
      [stage]: (prev[stage] || INITIAL_VISIBLE_PER_COLUMN) + LOAD_MORE_STEP,
    }))
  }

  async function moveLeadToStage(leadId: string, newStage: string) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, current_status: newStage } : l))
    await supabase.from('leads').update({ current_status: newStage, updated_at: new Date().toISOString() }).eq('id', leadId)
  }

  function onDragStart(e: React.DragEvent, leadId: string) {
    setDragging(leadId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent, stage: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stage)
  }

  function onDrop(e: React.DragEvent, stage: string) {
    e.preventDefault()
    if (dragging) moveLeadToStage(dragging, stage)
    setDragging(null)
    setDragOverStage(null)
  }

  function onDragEnd() {
    setDragging(null)
    setDragOverStage(null)
  }

  const openWA = useCallback((phone: string) => {
    const clean = phone.replace(/\D/g, '')
    const num = clean.startsWith('0') ? '62' + clean.slice(1) : clean.startsWith('62') ? clean : '62' + clean
    window.open(`https://wa.me/${num}`, '_blank')
  }, [])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-muted-foreground border border-border bg-card">
            <Users size={13} />
            <span>{leads.length} Total Leads</span>
          </div>
          <input
            type="text"
            placeholder="Cari nama atau source..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs text-foreground placeholder-muted-foreground bg-card border border-border outline-none w-52 focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
        <p className="text-[10px] text-muted-foreground/50 hidden md:block">Drag & drop kartu untuk pindah stage</p>
      </div>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-170px)]">
        {STAGES.map(stage => {
          const stageLeads = getLeadsByStage(stage.key)
          const visibleCount = getVisibleCount(stage.key)
          const visibleLeads = stageLeads.slice(0, visibleCount)
          const hiddenCount = Math.max(0, stageLeads.length - visibleLeads.length)
          const isOver = dragOverStage === stage.key

          return (
            <div
              key={stage.key}
              className="flex-shrink-0 w-[220px] flex flex-col rounded-2xl transition-all duration-150 h-full"
              style={{
                background: isOver ? stage.bg : 'hsl(var(--secondary))',
                border: `1px solid ${isOver ? stage.border : 'hsl(var(--border))'}`,
              }}
              onDragOver={e => onDragOver(e, stage.key)}
              onDrop={e => onDrop(e, stage.key)}
              onDragLeave={() => setDragOverStage(null)}
            >
              {/* Column Header */}
              <div className="px-3 pt-3 pb-2 flex items-center justify-between flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: stage.color }} />
                    <span className="text-[11px] font-extrabold text-foreground truncate leading-tight">{stage.label}</span>
                  </div>
                </div>
                <span
                  className="text-[10px] font-extrabold rounded-full px-1.5 py-0.5 min-w-[20px] text-center"
                  style={{ background: stage.bg, color: stage.color, border: `1px solid ${stage.border}` }}
                >
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto pr-1">
                {stageLeads.length === 0 ? (
                  <div
                    className="h-20 rounded-xl border-2 border-dashed flex items-center justify-center text-[10px] text-muted-foreground/30 transition-all"
                    style={{ borderColor: isOver ? stage.border : 'transparent' }}
                  >
                    {isOver ? 'Lepas di sini' : ''}
                  </div>
                ) : (
                  <>
                    {visibleLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={e => onDragStart(e, lead.id)}
                        onDragEnd={onDragEnd}
                        className={cn(
                          'p-3 rounded-xl border border-border bg-card shadow-xs hover:shadow-md cursor-grab active:cursor-grabbing transition-all duration-150 group',
                          dragging === lead.id ? 'opacity-40 scale-95' : ''
                        )}
                      >
                        {/* Drag handle + name */}
                        <div className="flex items-start gap-1.5">
                          <GripVertical size={12} className="text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-foreground leading-tight line-clamp-2">{lead.full_name}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{lead.source_campaign}</p>
                          </div>
                        </div>

                        {/* Meta */}
                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {lead.lead_type === 'outbound' && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>
                              OUT
                            </span>
                          )}
                          {lead.users?.name && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold truncate max-w-[80px]" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
                              {lead.users.name.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border">
                          <button
                            onClick={() => openWA(lead.whatsapp_number)}
                            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all cursor-pointer"
                          >
                            <MessageCircle size={10} /> WA
                          </button>
                          <Link
                            href={`/leads/${lead.id}`}
                            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[9px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-all"
                          >
                            <ExternalLink size={10} /> Detail
                          </Link>
                        </div>
                      </div>
                    ))}

                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => loadMore(stage.key)}
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-[10px] font-extrabold text-muted-foreground transition-all hover:text-foreground hover:bg-slate-50 dark:hover:bg-white/5"
                      >
                        Load {Math.min(LOAD_MORE_STEP, hiddenCount)} more ({hiddenCount} tersisa)
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

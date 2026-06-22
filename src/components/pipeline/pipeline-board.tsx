'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { MessageCircle, ExternalLink } from 'lucide-react'
import { generateWALink } from '@/lib/utils'

const STAGES = [
  { key: 'new', label: 'Baru', color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)' },
  { key: 'probing', label: 'Probing', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
  { key: 'hot', label: '🔥 Hot', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  { key: 'potential', label: 'Potensial', color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)' },
  { key: 'converted', label: '✅ Konversi', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
  { key: 'rejected', label: 'Reject', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
]

const SOURCE_ICONS: Record<string, string> = {
  ig: '📸', fb: '📘', linkedin: '💼', webinar: '🎓', manual: '✍️', referral: '🤝', other: '📌'
}

interface LeadCard {
  id: string
  name: string | null
  phone_number: string
  source: string
  stage: string
  inbound_date: string | null
  notes: string | null
  users?: { full_name: string } | null
}

interface PipelineBoardProps {
  initialLeads: LeadCard[]
}

export function PipelineBoard({ initialLeads }: PipelineBoardProps) {
  const [leads, setLeads] = useState<LeadCard[]>(initialLeads)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)

  const supabase = createClient()

  function getLeadsByStage(stage: string) {
    return leads.filter(l => l.stage === stage)
  }

  async function moveLeadToStage(leadId: string, newStage: string) {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l))

    await supabase
      .from('leads')
      .update({ stage: newStage as any })
      .eq('id', leadId)
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
    if (dragging) {
      moveLeadToStage(dragging, stage)
    }
    setDragging(null)
    setDragOverStage(null)
  }

  function onDragEnd() {
    setDragging(null)
    setDragOverStage(null)
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-160px)]">
      {STAGES.map(stage => {
        const stageLeads = getLeadsByStage(stage.key)
        const isOver = dragOverStage === stage.key

        return (
          <div
            key={stage.key}
            className="flex-shrink-0 w-72 flex flex-col rounded-2xl transition-all"
            style={{
              background: isOver ? `${stage.color}10` : 'rgba(255,255,255,0.02)',
              border: isOver ? `2px solid ${stage.color}50` : '1px solid rgba(255,255,255,0.06)',
            }}
            onDragOver={e => onDragOver(e, stage.key)}
            onDrop={e => onDrop(e, stage.key)}
          >
            {/* Column header */}
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                <span className="text-sm font-semibold text-white">{stage.label}</span>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ background: `${stage.color}20`, color: stage.color }}
              >
                {stageLeads.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto">
              {stageLeads.map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={e => onDragStart(e, lead.id)}
                  onDragEnd={onDragEnd}
                  className="p-3 rounded-xl cursor-grab active:cursor-grabbing transition-all group hover:scale-[1.01]"
                  style={{
                    background: dragging === lead.id ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
                    border: dragging === lead.id ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.07)',
                    opacity: dragging === lead.id ? 0.7 : 1,
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-white leading-tight">
                      {lead.name || 'Tanpa Nama'}
                    </p>
                    <span className="text-xs flex-shrink-0">{SOURCE_ICONS[lead.source] || '📌'}</span>
                  </div>

                  <p className="text-xs text-white/40 font-mono mb-2">{lead.phone_number}</p>

                  {lead.notes && (
                    <p className="text-xs text-white/30 truncate mb-2 italic">{lead.notes}</p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/30">
                      {/* @ts-ignore */}
                      {lead.users?.full_name || 'No PIC'}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={generateWALink(lead.phone_number)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-500/15 transition-colors"
                      >
                        <MessageCircle size={12} />
                      </a>
                      <Link
                        href={`/leads/${lead.id}`}
                        onClick={e => e.stopPropagation()}
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-purple-400 hover:bg-purple-500/15 transition-colors"
                      >
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {stageLeads.length === 0 && (
                <div
                  className="h-16 rounded-xl border-2 border-dashed flex items-center justify-center"
                  style={{ borderColor: `${stage.color}30` }}
                >
                  <p className="text-xs" style={{ color: `${stage.color}60` }}>Drop leads di sini</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  PIPELINE_BOARD_COLUMNS,
  getStageBadgeClasses,
  resolveBoardDropStatus,
} from '@/lib/brand'
import { MessageCircle, ExternalLink, GripVertical, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [moveError, setMoveError] = useState('')

  const supabase = createClient()

  const filtered = searchQuery
    ? leads.filter(
        (l) =>
          l.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.source_campaign?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : leads

  function getLeadsByColumn(columnKey: string) {
    const column = PIPELINE_BOARD_COLUMNS.find((c) => c.key === columnKey)
    if (!column) return []
    return filtered.filter((l) => column.statuses.includes(l.current_status))
  }

  function getVisibleCount(columnKey: string) {
    return visibleCounts[columnKey] || INITIAL_VISIBLE_PER_COLUMN
  }

  function loadMore(columnKey: string) {
    setVisibleCounts((prev) => ({
      ...prev,
      [columnKey]: (prev[columnKey] || INITIAL_VISIBLE_PER_COLUMN) + LOAD_MORE_STEP,
    }))
  }

  async function moveLeadToColumn(leadId: string, columnKey: string) {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    const newStatus = resolveBoardDropStatus(lead.current_status, columnKey)
    if (!newStatus || lead.current_status === newStatus) return

    const previousLeads = leads
    setMoveError('')
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, current_status: newStatus } : l)))

    try {
      const { data: authData } = await supabase.auth.getUser()
      const actorId = authData.user?.id || null

      const [updateRes, activityRes] = await Promise.all([
        supabase
          .from('leads')
          .update({
            current_status: newStatus,
            updated_at: new Date().toISOString(),
            updated_by: actorId,
          })
          .eq('id', leadId),
        supabase.from('lead_activities').insert({
          lead_id: leadId,
          activity_type: 'Status changed',
          description: `Status changed to ${newStatus} via Pipeline Board (tahap mapping)`,
          created_by: actorId,
        }),
      ])

      if (updateRes.error || activityRes.error) {
        throw updateRes.error || activityRes.error
      }
    } catch (err) {
      setLeads(previousLeads)
      const message = err instanceof Error ? err.message : 'Gagal memindahkan lead'
      setMoveError(message)
      console.error('Failed to update stage or log activity:', err)
    }
  }

  function onDragStart(e: React.DragEvent, leadId: string) {
    setDragging(leadId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent, columnKey: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(columnKey)
  }

  function onDrop(e: React.DragEvent, columnKey: string) {
    e.preventDefault()
    if (dragging) void moveLeadToColumn(dragging, columnKey)
    setDragging(null)
    setDragOverStage(null)
  }

  function onDragEnd() {
    setDragging(null)
    setDragOverStage(null)
  }

  const openWA = useCallback((phone: string) => {
    const clean = phone.replace(/\D/g, '')
    const num = clean.startsWith('0')
      ? '62' + clean.slice(1)
      : clean.startsWith('62')
        ? clean
        : '62' + clean
    window.open(`https://wa.me/${num}`, '_blank')
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-muted-foreground border border-border bg-card">
            <Users size={13} />
            <span>{leads.length} lead</span>
          </div>
          <input
            type="text"
            placeholder="Cari nama atau campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 rounded-xl text-xs text-foreground placeholder-muted-foreground bg-card border border-border outline-none w-52 focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
        <p className="text-[10px] text-muted-foreground hidden md:block">
          Kolom = tahap 1–6 (Menang/Lost dipisah agar aman). Drag untuk pindah status.
        </p>
      </div>

      {moveError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2 text-xs font-semibold text-destructive">
          {moveError}
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4 h-[calc(100vh-170px)]">
        {PIPELINE_BOARD_COLUMNS.map((column) => {
          const stageLeads = getLeadsByColumn(column.key)
          const visibleCount = getVisibleCount(column.key)
          const visibleLeads = stageLeads.slice(0, visibleCount)
          const hiddenCount = Math.max(0, stageLeads.length - visibleLeads.length)
          const isOver = dragOverStage === column.key

          return (
            <div
              key={column.key}
              className="flex-shrink-0 w-[200px] flex flex-col rounded-2xl transition-colors duration-150 h-full border"
              style={{
                background: isOver ? column.soft : 'hsl(var(--secondary))',
                borderColor: isOver ? column.color : 'hsl(var(--border))',
              }}
              onDragOver={(e) => onDragOver(e, column.key)}
              onDrop={(e) => onDrop(e, column.key)}
              onDragLeave={() => setDragOverStage(null)}
            >
              <div className="px-3 pt-3 pb-2 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: column.color }} />
                  <span className="text-[11px] font-bold text-foreground truncate leading-tight">
                    {column.label}
                  </span>
                </div>
                <span
                  className="text-[10px] font-bold rounded-md px-1.5 py-0.5 min-w-[20px] text-center"
                  style={{ background: column.soft, color: column.color }}
                >
                  {stageLeads.length}
                </span>
              </div>

              <div className="flex-1 px-2 pb-2 space-y-2 overflow-y-auto pr-1">
                {stageLeads.length === 0 ? (
                  <div
                    className="h-20 rounded-xl border-2 border-dashed flex items-center justify-center text-[10px] text-muted-foreground/40"
                    style={{ borderColor: isOver ? column.color : 'transparent' }}
                  >
                    {isOver ? 'Lepas di sini' : 'Kosong'}
                  </div>
                ) : (
                  <>
                    {visibleLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, lead.id)}
                        onDragEnd={onDragEnd}
                        className={cn(
                          'p-3 rounded-xl border border-border bg-card hover:border-primary/20 cursor-grab active:cursor-grabbing transition-all duration-150',
                          dragging === lead.id ? 'opacity-40 scale-95' : ''
                        )}
                      >
                        <div className="flex items-start gap-1.5">
                          <GripVertical size={12} className="text-muted-foreground/40 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">
                              {lead.full_name}
                            </p>
                            <p className="text-[9px] text-muted-foreground mt-0.5 truncate">
                              {lead.source_campaign}
                            </p>
                            <span
                              className={cn(
                                'inline-block mt-1 text-[8px] px-1.5 py-0.5 rounded-md',
                                getStageBadgeClasses(lead.current_status)
                              )}
                            >
                              {lead.current_status}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 mt-2 flex-wrap">
                          {lead.lead_type === 'outbound' && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold bg-secondary text-muted-foreground">
                              OUT
                            </span>
                          )}
                          {lead.users?.name && (
                            <span className="text-[8px] px-1.5 py-0.5 rounded-md font-bold truncate max-w-[80px] bg-secondary text-foreground">
                              {lead.users.name.split(' ')[0]}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border">
                          <button
                            type="button"
                            onClick={() => openWA(lead.whatsapp_number)}
                            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[9px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20"
                          >
                            <MessageCircle size={10} /> WA
                          </button>
                          <Link
                            href={`/leads/${lead.id}`}
                            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[9px] font-semibold text-primary bg-secondary hover:bg-secondary/80"
                          >
                            <ExternalLink size={10} /> Detail
                          </Link>
                        </div>
                      </div>
                    ))}

                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        onClick={() => loadMore(column.key)}
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-[10px] font-bold text-muted-foreground hover:text-foreground"
                      >
                        Muat {Math.min(LOAD_MORE_STEP, hiddenCount)} lagi ({hiddenCount})
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

'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  PIPELINE_BOARD_COLUMNS,
  getStageBadgeClasses,
  resolveBoardDropStatus,
} from '@/lib/brand'
import { MessageCircle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const INITIAL_VISIBLE_PER_COLUMN = 10
const LOAD_MORE_STEP = 10

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

/** Two rows so columns stay readable on a normal desktop width. */
const BOARD_ROWS = [
  ['baru', 'diskusi', 'pemetaan', 'expert'],
  ['closing', 'menang', 'lost'],
] as const

export function PipelineBoard({ initialLeads }: PipelineBoardProps) {
  const [leads, setLeads] = useState<LeadCard[]>(initialLeads)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>({})
  const [moveError, setMoveError] = useState('')
  const [focusColumn, setFocusColumn] = useState<string | null>(null)

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

  function onDragStart(_e: React.DragEvent, leadId: string) {
    setDragging(leadId)
  }

  function onDragEnd() {
    setDragging(null)
    setDragOverStage(null)
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

  const openWA = useCallback((phone: string) => {
    const clean = phone.replace(/\D/g, '')
    const num = clean.startsWith('62')
      ? clean
      : clean.startsWith('0')
        ? `62${clean.slice(1)}`
        : `62${clean}`
    window.open(`https://wa.me/${num}`, '_blank')
  }, [])

  function renderColumn(columnKey: string) {
    const column = PIPELINE_BOARD_COLUMNS.find((c) => c.key === columnKey)
    if (!column) return null

    const stageLeads = getLeadsByColumn(column.key)
    const visibleLeads = stageLeads.slice(0, getVisibleCount(column.key))
    const hiddenCount = Math.max(0, stageLeads.length - visibleLeads.length)
    const isOver = dragOverStage === column.key

    return (
      <div
        key={column.key}
        className="flex min-h-[24rem] flex-col rounded-2xl border transition-colors"
        style={{
          background: isOver ? column.soft : 'hsl(var(--card))',
          borderColor: isOver ? column.color : 'hsl(var(--border))',
        }}
        onDragOver={(e) => onDragOver(e, column.key)}
        onDrop={(e) => onDrop(e, column.key)}
        onDragLeave={() => setDragOverStage(null)}
      >
        <div className="flex items-center justify-between gap-2 px-3.5 pt-3.5 pb-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: column.color }} />
            <span className="font-display text-sm font-semibold tracking-tight text-foreground truncate">
              {column.label}
            </span>
          </div>
          <span
            className="rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums"
            style={{ background: column.soft, color: column.color }}
          >
            {stageLeads.length}
          </span>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-2.5 pb-3">
          {stageLeads.length === 0 ? (
            <div
              className="flex h-24 items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground"
              style={{ borderColor: isOver ? column.color : 'hsl(var(--border))' }}
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
                    'rounded-xl border border-border bg-background px-3 py-2.5 transition-all',
                    'hover:border-primary/25 cursor-grab active:cursor-grabbing',
                    dragging === lead.id && 'opacity-40 scale-[0.98]'
                  )}
                  style={{ borderLeftWidth: 3, borderLeftColor: column.color }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="block text-[13px] font-semibold leading-snug text-foreground hover:text-accent line-clamp-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {lead.full_name}
                      </Link>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {lead.source_campaign}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openWA(lead.whatsapp_number)}
                      className="shrink-0 rounded-lg border border-border p-1.5 text-emerald-700 hover:bg-emerald-500/10"
                      title="WhatsApp"
                    >
                      <MessageCircle size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        'inline-block rounded-md px-1.5 py-0.5 text-[10px]',
                        getStageBadgeClasses(lead.current_status)
                      )}
                    >
                      {lead.current_status}
                    </span>
                    {lead.users?.name && (
                      <span className="truncate text-[10px] text-muted-foreground">
                        {lead.users.name.split(' ')[0]}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => loadMore(column.key)}
                  className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                >
                  +{Math.min(LOAD_MORE_STEP, hiddenCount)} lagi ({hiddenCount})
                </button>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 font-sans">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
            <Users size={13} />
            <span className="font-semibold tabular-nums text-foreground">{filtered.length}</span>
            <span>lead</span>
          </div>
          <input
            type="text"
            placeholder="Cari nama atau campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-56 rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {focusColumn && (
            <button
              type="button"
              onClick={() => setFocusColumn(null)}
              className="text-[11px] font-semibold text-accent hover:opacity-80"
            >
              Tampilkan semua kolom
            </button>
          )}
        </div>
        <p className="hidden text-[11px] text-muted-foreground lg:block">
          Ringkasan di atas untuk fokus · drag kartu untuk pindah tahap
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-7">
        {PIPELINE_BOARD_COLUMNS.map((column) => {
          const count = getLeadsByColumn(column.key).length
          const active = focusColumn === column.key
          return (
            <button
              key={column.key}
              type="button"
              onClick={() => setFocusColumn((prev) => (prev === column.key ? null : column.key))}
              className={cn(
                'rounded-xl border px-2.5 py-2 text-left transition-colors',
                active ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-secondary/50'
              )}
            >
              <p className="truncate text-[10px] font-semibold text-muted-foreground">{column.label}</p>
              <p className="mt-0.5 font-display text-xl font-semibold tracking-tight tabular-nums text-foreground">
                {count}
              </p>
            </button>
          )
        })}
      </div>

      {moveError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2 text-xs font-semibold text-destructive">
          {moveError}
        </div>
      )}

      {focusColumn ? (
        <div className="grid grid-cols-1">{renderColumn(focusColumn)}</div>
      ) : (
        <div className="space-y-3">
          {BOARD_ROWS.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={cn(
                'grid gap-3',
                rowIndex === 0
                  ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
                  : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'
              )}
            >
              {row.map((key) => renderColumn(key))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

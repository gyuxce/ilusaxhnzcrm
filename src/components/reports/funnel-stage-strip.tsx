'use client'

import Link from 'next/link'
import { FUNNEL_STAGES } from '@/lib/brand'
import { cn } from '@/lib/utils'

type StageCount = { stageId: number; count: number }

export function FunnelStageStrip({
  counts,
  loading,
  lang = 'id',
  hrefForStage,
}: {
  counts: StageCount[]
  loading?: boolean
  lang?: 'id' | 'en'
  hrefForStage?: (stageId: number) => string
}) {
  const max = Math.max(1, ...counts.map((c) => c.count))

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
      {FUNNEL_STAGES.map((stage) => {
        const count = counts.find((c) => c.stageId === stage.id)?.count || 0
        const share = Math.round((count / max) * 100)
        const label = lang === 'en' ? stage.labelEn : stage.labelId
        const href =
          hrefForStage?.(stage.id) ||
          (stage.id === 6
            ? '/conversions?type=seat_lock'
            : `/leads?status=${encodeURIComponent(stage.statuses[0])}`)

        const content = (
          <>
            <div className="flex items-center justify-between gap-2">
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-semibold text-white"
                style={{ background: stage.color }}
              >
                {stage.id}
              </span>
              <span className="font-display text-2xl font-semibold tracking-tight tabular-nums text-foreground">
                {loading ? '—' : count}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">{label}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug line-clamp-2">
              {stage.meaningId}
            </p>
            {/* Tiny share cue — not a full-width target bar */}
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                {loading ? '—' : `${share}%`}
              </span>
              <span className="relative h-1 flex-1 rounded-full bg-secondary overflow-hidden">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-foreground/25"
                  style={{ width: loading ? '0%' : `${Math.max(share, count > 0 ? 8 : 0)}%` }}
                />
              </span>
            </div>
          </>
        )

        return href ? (
          <Link
            key={stage.id}
            href={href}
            className={cn(
              'rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-secondary/50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20'
            )}
          >
            {content}
          </Link>
        ) : (
          <div key={stage.id} className="rounded-xl border border-border bg-card p-3.5">
            {content}
          </div>
        )
      })}
    </div>
  )
}

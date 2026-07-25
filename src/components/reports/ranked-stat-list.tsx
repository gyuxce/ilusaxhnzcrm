import Link from 'next/link'
import { cn } from '@/lib/utils'

export type RankedStat = {
  name: string
  count: number
  percent?: number
  href?: string
}

/** Ranked list without full-width progress bars — number-first, calmer hierarchy. */
export function RankedStatList({
  rows,
  empty,
  valueSuffix = '',
}: {
  rows: RankedStat[]
  empty: string
  valueSuffix?: string
}) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>
  }

  return (
    <ol className="divide-y divide-border">
      {rows.map((row, index) => {
        const body = (
          <div className="flex items-center gap-3 py-3">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold tabular-nums',
                index === 0
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground'
              )}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{row.name}</p>
              {typeof row.percent === 'number' && (
                <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                  {row.percent}% dari total
                </p>
              )}
            </div>
            <span className="font-display text-xl font-semibold tracking-tight tabular-nums text-foreground">
              {row.count}
              {valueSuffix}
            </span>
          </div>
        )

        return (
          <li key={row.name}>
            {row.href ? (
              <Link href={row.href} className="block hover:bg-secondary/40 -mx-1 px-1 rounded-lg transition-colors">
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        )
      })}
    </ol>
  )
}

import { cn } from '@/lib/utils'
import { resolveEntity, type Entity } from '@/lib/entity'

/** Small HNZ/KFI pill, resolved from campaign_entity_overrides (falls back to keyword guess). */
export function EntityBadge({
  sourceCampaign,
  overrides,
  className,
}: {
  sourceCampaign: string | null | undefined
  overrides: ReadonlyMap<string, Entity>
  className?: string
}) {
  const entity = resolveEntity(sourceCampaign, overrides)
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold',
        entity === 'KFI'
          ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
          : 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
        className
      )}
    >
      {entity}
    </span>
  )
}

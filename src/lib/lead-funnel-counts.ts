import {
  STAGE1_CURRENT_STATUS_OPTIONS,
  STAGE2_VISIBLE_STATUSES,
  STAGE3_STATUS_OPTIONS,
  isStage3WonStatus,
} from '@/lib/prd-stages'
import { isLostOutcomeStatus } from '@/lib/brand'

function includes(list: readonly string[], value: string) {
  return list.includes(value as never)
}

export type LeadFunnelCounts = {
  total: number
  stage1: number
  stage2: number
  stage3: number
  won: number
  exit: number
}

/**
 * Single source of truth for "how many leads are at each funnel stage".
 * Cold Leads/Failed are members of STAGE3_STATUS_OPTIONS (Stage 3 kanban has
 * its own exit columns) but are also exit outcomes — excluded from stage3
 * here so a lead is counted in exactly one bucket (see the Stage 3/Keluar
 * double-counting fix this same logic used to have inline in dashboard).
 */
export function countLeadFunnel<T extends { current_status: string }>(rows: T[]): LeadFunnelCounts {
  const stage1 = rows.filter(
    (l) => includes(STAGE1_CURRENT_STATUS_OPTIONS, l.current_status) || l.current_status === 'New Lead'
  ).length
  const stage2 = rows.filter((l) => includes(STAGE2_VISIBLE_STATUSES, l.current_status)).length
  const stage3 = rows.filter(
    (l) => includes(STAGE3_STATUS_OPTIONS, l.current_status) && !isLostOutcomeStatus(l.current_status)
  ).length
  const won = rows.filter((l) => isStage3WonStatus(l.current_status)).length
  const exit = rows.filter((l) => isLostOutcomeStatus(l.current_status)).length
  return { total: rows.length, stage1, stage2, stage3, won, exit }
}

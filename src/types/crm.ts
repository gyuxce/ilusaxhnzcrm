import type {
  LeadRow,
  UserRow,
  PaymentRow,
  PemetaanRow,
  ExpertConsultationRow,
  LeadActivityRow,
  FollowUpRow,
  LeadInterventionRow,
  FuType,
} from '@/lib/supabase/types'

export type UserSummary = Pick<UserRow, 'id' | 'name'>

export type LeadWithAssignedUser = LeadRow & {
  users?: UserSummary | null
}

export type LeadWithUsers = LeadRow & {
  created_by_user?: UserSummary | null
  updated_by_user?: UserSummary | null
}

export type ActivityWithUser = LeadActivityRow & {
  users?: UserSummary | null
}

export type LeadDetailProps = {
  initialLead: LeadWithUsers
  initialPayments: PaymentRow[]
  initialPemetaan: PemetaanRow[]
  initialExpertConsultations: ExpertConsultationRow[]
  initialActivities: ActivityWithUser[]
  initialFollowUps?: FollowUpWithLead[]
  initialInterventions?: LeadInterventionWithUser[]
  pics: UserSummary[]
}

export type LeadInterventionWithUser = LeadInterventionRow & {
  users?: UserSummary | null
}

export type FollowUpWithLead = FollowUpRow & {
  leads?: Pick<LeadRow, 'id' | 'full_name' | 'whatsapp_number' | 'current_status' | 'source_campaign'> | null
  users?: UserSummary | null
}

export type NeedsActionLead = LeadRow & {
  users?: Pick<UserRow, 'name'> | null
}

export type NeedsActionType =
  | 'set_waiting_result'
  | 'send_result'
  | 'schedule_expert'
  | 'offer_seat_lock'
  | 'pay_seat_lock'

export type JsonRecord = Record<string, unknown>

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function getFuTypeLabel(fuType: string): string {
  const labels: Record<FuType, string> = {
    whatsapp: '🟢 WhatsApp',
    chat: '💬 Chat',
    call: '📞 Telepon',
    meeting: '🤝 Meeting',
  }
  return labels[fuType as FuType] ?? fuType
}

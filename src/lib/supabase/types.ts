export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'owner' | 'cro'
export type LeadSource = string
export type LeadType = 'inbound' | 'outbound'
export type LeadStage = string
export type FuType = 'chat' | 'call' | 'meeting' | 'whatsapp'
export type MessageStatus = string
export type PlaybookCategory = 'script' | 'objection' | 'product' | 'sop' | 'faq'

// Users Types

export type UserRow = {
  id: string
  name: string
  email: string
  password_hash: string | null
  role: UserRole
  created_at: string
}
export type UserInsert = {
  id: string
  name: string
  email: string
  password_hash?: string | null
  role?: UserRole
  created_at?: string
}
export type UserUpdate = Partial<UserInsert>

// Leads Types
export type LeadRow = {
  id: string
  full_name: string
  whatsapp_number: string
  email: string | null
  source_campaign: string
  lead_type: LeadType
  assigned_cro_id: string | null
  current_status: string
  lead_entry_date: string
  last_contacted_date: string | null
  follow_up_result: string | null
  notes: string | null
  lost_reason: string | null
  lead_quality: string | null
  lead_segment: string | null
  entry_channel: string | null
  next_action: string | null
  next_follow_up_date: string | null
  funnel_notes: string | null
  created_by: string | null
  updated_by: string | null
  duplicate_of: string | null
  duplicate_reason: string | null
  whatsapp_normalized: string | null
  created_at: string
  updated_at: string
}
export type LeadInsert = {
  id?: string
  full_name: string
  whatsapp_number: string
  email?: string | null
  source_campaign: string
  lead_type?: LeadType
  assigned_cro_id?: string | null
  current_status?: string
  lead_entry_date?: string
  last_contacted_date?: string | null
  follow_up_result?: string | null
  notes?: string | null
  lost_reason?: string | null
  lead_quality?: string | null
  lead_segment?: string | null
  entry_channel?: string | null
  next_action?: string | null
  next_follow_up_date?: string | null
  funnel_notes?: string | null
  created_by?: string | null
  updated_by?: string | null
  duplicate_of?: string | null
  duplicate_reason?: string | null
  whatsapp_normalized?: string | null
  created_at?: string
  updated_at?: string
}
export type LeadUpdate = Partial<LeadInsert>

// Payments Types
export type PaymentRow = {
  id: string
  lead_id: string
  payment_type: string
  amount: number
  payment_method: string
  payment_date: string
  proof_url: string | null
  verification_status: string
  verified_by: string | null
  verified_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
export type PaymentInsert = {
  id?: string
  lead_id: string
  payment_type: string
  amount: number
  payment_method: string
  payment_date: string
  proof_url?: string | null
  verification_status?: string
  verified_by?: string | null
  verified_at?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}
export type PaymentUpdate = Partial<PaymentInsert>

// Pemetaan Types
export type PemetaanRow = {
  id: string
  lead_id: string
  form_status: string
  scheduled_at: string | null
  completed_at: string | null
  result_status: string
  result_ready_at: string | null
  result_notes: string | null
  created_at: string
  updated_at: string
}
export type PemetaanInsert = {
  id?: string
  lead_id: string
  form_status?: string
  scheduled_at?: string | null
  completed_at?: string | null
  result_status?: string
  result_ready_at?: string | null
  result_notes?: string | null
  created_at?: string
  updated_at?: string
}
export type PemetaanUpdate = Partial<PemetaanInsert>

// Expert Consultations Types
export type ExpertConsultationRow = {
  id: string
  lead_id: string
  expert_name: string | null
  scheduled_at: string | null
  completed_at: string | null
  consultation_result: string | null
  recommendation: string | null
  next_step: string | null
  created_at: string
  updated_at: string
}
export type ExpertConsultationInsert = {
  id?: string
  lead_id: string
  expert_name?: string | null
  scheduled_at?: string | null
  completed_at?: string | null
  consultation_result?: string | null
  recommendation?: string | null
  next_step?: string | null
  created_at?: string
  updated_at?: string
}
export type ExpertConsultationUpdate = Partial<ExpertConsultationInsert>

// Lead Activities Types
export type LeadActivityRow = {
  id: string
  lead_id: string
  activity_type: string
  description: string
  created_by: string | null
  created_at: string
}
export type LeadActivityInsert = {
  id?: string
  lead_id: string
  activity_type: string
  description: string
  created_by?: string | null
  created_at?: string
}
export type LeadActivityUpdate = never

// Batch Targets Types
export type BatchTargetRow = {
  id: string
  batch_name: string
  target_seat_lock: number
  start_date: string
  closing_date: string
  notes: string | null
  created_at: string
  updated_at: string
}
export type BatchTargetInsert = {
  id?: string
  batch_name: string
  target_seat_lock: number
  start_date: string
  closing_date: string
  notes?: string | null
  created_at?: string
  updated_at?: string
}
export type BatchTargetUpdate = Partial<BatchTargetInsert>

// Follow-Up Types
export type FollowUpRow = {
  id: string
  lead_id: string
  pic_id: string | null
  scheduled_date: string
  fu_type: FuType
  notes: string | null
  is_done: boolean
  done_at: string | null
  result: string | null
  created_at: string
  updated_at: string
}
export type FollowUpInsert = {
  id?: string
  lead_id: string
  pic_id?: string | null
  scheduled_date: string
  fu_type?: FuType
  notes?: string | null
  is_done?: boolean
  done_at?: string | null
  result?: string | null
  created_at?: string
  updated_at?: string
}
export type FollowUpUpdate = Partial<FollowUpInsert>

// Playbook Item Types
export type PlaybookItemRow = {
  id: string
  category: PlaybookCategory
  title: string
  content: string
  tags: string[]
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}
export type PlaybookItemInsert = {
  id?: string
  category: PlaybookCategory
  title: string
  content: string
  tags?: string[]
  is_active?: boolean
  created_by?: string | null
  created_at?: string
  updated_at?: string
}
export type PlaybookItemUpdate = Partial<PlaybookItemInsert>

// Lead Intervention Types
export type LeadInterventionRow = {
  id: string
  lead_id: string
  created_by: string | null
  lead_condition: string | null
  objection_category: string | null
  solution_given: string | null
  expert_needed: boolean
  expert_type: string | null
  commercial_type: string | null
  service_opportunity: string | null
  next_action: string | null
  next_follow_up_date: string | null
  result: string | null
  notes: string | null
  created_at: string
  updated_at: string
}
export type LeadInterventionInsert = {
  id?: string
  lead_id: string
  created_by?: string | null
  lead_condition?: string | null
  objection_category?: string | null
  solution_given?: string | null
  expert_needed?: boolean
  expert_type?: string | null
  commercial_type?: string | null
  service_opportunity?: string | null
  next_action?: string | null
  next_follow_up_date?: string | null
  result?: string | null
  notes?: string | null
  created_at?: string
  updated_at?: string
}
export type LeadInterventionUpdate = Partial<LeadInterventionInsert>

export type Database = {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: UserInsert
        Update: UserUpdate
      }
      leads: {
        Row: LeadRow
        Insert: LeadInsert
        Update: LeadUpdate
      }
      payments: {
        Row: PaymentRow
        Insert: PaymentInsert
        Update: PaymentUpdate
      }
      pemetaan: {
        Row: PemetaanRow
        Insert: PemetaanInsert
        Update: PemetaanUpdate
      }
      expert_consultations: {
        Row: ExpertConsultationRow
        Insert: ExpertConsultationInsert
        Update: ExpertConsultationUpdate
      }
      lead_activities: {
        Row: LeadActivityRow
        Insert: LeadActivityInsert
        Update: LeadActivityUpdate
      }
      batch_targets: {
        Row: BatchTargetRow
        Insert: BatchTargetInsert
        Update: BatchTargetUpdate
      }
      follow_ups: {
        Row: FollowUpRow
        Insert: FollowUpInsert
        Update: FollowUpUpdate
      }
      playbook_items: {
        Row: PlaybookItemRow
        Insert: PlaybookItemInsert
        Update: PlaybookItemUpdate
      }
      lead_interventions: {
        Row: LeadInterventionRow
        Insert: LeadInterventionInsert
        Update: LeadInterventionUpdate
      }
    }
    Views: Record<string, never>
    Functions: {
      save_work_queue_fast: {
        Args: {
          p_lead_id: string
          p_current_status: string
          p_next_status: string
          p_lead_condition: string
          p_objection_category: string
          p_solution_given: string
          p_expert_needed?: boolean
          p_expert_type?: string | null
          p_commercial_type?: string | null
          p_service_opportunity?: string | null
          p_next_action?: string | null
          p_next_follow_up_date?: string | null
          p_result?: string | null
          p_notes?: string | null
          p_funnel_notes?: string | null
          p_follow_up_id?: string | null
          p_complete_follow_up?: boolean
          p_close_lead?: boolean
          p_lost_status?: string | null
          p_lost_reason?: string | null
        }
        Returns: Json
      }
      create_lead_fast: {
        Args: {
          p_full_name: string
          p_whatsapp_number: string
          p_email?: string | null
          p_source_campaign?: string | null
          p_lead_type?: string | null
          p_current_status?: string | null
          p_assigned_cro_id?: string | null
          p_notes?: string | null
          p_lead_entry_date?: string | null
        }
        Returns: Json
      }
      update_lead_core_fast: {
        Args: {
          p_lead_id: string
          p_full_name: string
          p_whatsapp_number: string
          p_email?: string | null
          p_source_campaign?: string | null
          p_current_status?: string | null
          p_assigned_cro_id?: string | null
          p_notes?: string | null
          p_lost_reason?: string | null
          p_lead_entry_date?: string | null
        }
        Returns: Json
      }
      apply_needs_action_fast: {
        Args: {
          p_lead_id: string
          p_action_type: string
          p_input_val?: string | null
          p_input_val2?: string | null
        }
        Returns: Json
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Lead = LeadRow
export type User = UserRow
export type Payment = PaymentRow
export type Pemetaan = PemetaanRow
export type ExpertConsultation = ExpertConsultationRow
export type LeadActivity = LeadActivityRow
export type BatchTarget = BatchTargetRow
export type FollowUp = FollowUpRow
export type PlaybookItem = PlaybookItemRow
export type LeadIntervention = LeadInterventionRow

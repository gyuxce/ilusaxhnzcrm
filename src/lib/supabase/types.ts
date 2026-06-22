export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type LeadSource = 'ig' | 'fb' | 'linkedin' | 'webinar' | 'manual' | 'referral' | 'other'
export type LeadType = 'inbound' | 'outbound'
export type LeadStage = 'new' | 'probing' | 'hot' | 'potential' | 'converted' | 'rejected'
export type FuType = 'd1' | 'd3' | 'd7' | 'd14' | 'fu1' | 'fu2' | 'fu3' | 'fu4' | 'custom'
export type MessageStatus = 'connected' | 'not_connected' | 'no_response' | 'restricted' | 'pending'
export type ConversionType = 'pemetaan' | 'full_payment' | 'dp' | 'webinar_attend'
export type UserRole = 'admin' | 'cro' | 'manager'
export type CampaignType = 'webinar' | 'ads_ig' | 'ads_fb' | 'organic' | 'event'
export type PlaybookCategory = 'script' | 'objection' | 'product' | 'sop' | 'faq'

// Users Types
export type UserRow = {
  id: string
  full_name: string
  role: UserRole
  wa_number: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
export type UserInsert = {
  id: string
  full_name: string
  role?: UserRole
  wa_number?: string | null
  avatar_url?: string | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
}
export type UserUpdate = Partial<UserInsert>

// Leads Types
export type LeadRow = {
  id: string
  phone_number: string
  name: string | null
  source: LeadSource
  lead_type: LeadType
  inbound_date: string | null
  pic_id: string | null
  campaign_id: string | null
  stage: LeadStage
  education: string | null
  age: number | null
  current_position: string | null
  segment: string | null
  reach_out_channel: string | null
  final_status: string | null
  rejection_reason: string | null
  notes: string | null
  is_duplicate: boolean
  duplicate_of: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
export type LeadInsert = {
  id?: string
  phone_number: string
  name?: string | null
  source?: LeadSource
  lead_type?: LeadType
  inbound_date?: string | null
  pic_id?: string | null
  campaign_id?: string | null
  stage?: LeadStage
  education?: string | null
  age?: number | null
  current_position?: string | null
  segment?: string | null
  reach_out_channel?: string | null
  final_status?: string | null
  rejection_reason?: string | null
  notes?: string | null
  is_duplicate?: boolean
  duplicate_of?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}
export type LeadUpdate = Partial<LeadInsert>

// Follow-ups Types
export type FollowUpRow = {
  id: string
  lead_id: string
  fu_type: FuType
  scheduled_date: string | null
  actual_date: string | null
  pic_id: string | null
  status_message: MessageStatus | null
  stage_after: LeadStage | null
  note: string | null
  is_done: boolean
  created_at: string
  updated_at: string
}
export type FollowUpInsert = {
  id?: string
  lead_id: string
  fu_type: FuType
  scheduled_date?: string | null
  actual_date?: string | null
  pic_id?: string | null
  status_message?: MessageStatus | null
  stage_after?: LeadStage | null
  note?: string | null
  is_done?: boolean
  created_at?: string
  updated_at?: string
}
export type FollowUpUpdate = Partial<FollowUpInsert>

// Campaigns Types
export type CampaignRow = {
  id: string
  name: string
  type: CampaignType
  batch: string | null
  event_date: string | null
  description: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}
export type CampaignInsert = {
  id?: string
  name: string
  type?: CampaignType
  batch?: string | null
  event_date?: string | null
  description?: string | null
  is_active?: boolean
  created_by?: string | null
  created_at?: string
  updated_at?: string
}
export type CampaignUpdate = Partial<CampaignInsert>

// Conversions Types
export type ConversionRow = {
  id: string
  lead_id: string
  conversion_type: ConversionType
  conversion_date: string | null
  amount: number | null
  interview_date: string | null
  interview_result: string | null
  attended_event: boolean | null
  cv_submitted: boolean | null
  note: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}
export type ConversionInsert = {
  id?: string
  lead_id: string
  conversion_type?: ConversionType
  conversion_date?: string | null
  amount?: number | null
  interview_date?: string | null
  interview_result?: string | null
  attended_event?: boolean | null
  cv_submitted?: boolean | null
  note?: string | null
  created_by?: string | null
  created_at?: string
  updated_at?: string
}
export type ConversionUpdate = Partial<ConversionInsert>

// Activities Types
export type ActivityRow = {
  id: string
  lead_id: string | null
  user_id: string | null
  action: string
  old_value: Json | null
  new_value: Json | null
  created_at: string
}
export type ActivityInsert = {
  id?: string
  lead_id?: string | null
  user_id?: string | null
  action: string
  old_value?: Json | null
  new_value?: Json | null
  created_at?: string
}
export type ActivityUpdate = never

// Playbook Items Types
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
  category?: PlaybookCategory
  title: string
  content: string
  tags?: string[]
  is_active?: boolean
  created_by?: string | null
  created_at?: string
  updated_at?: string
}
export type PlaybookItemUpdate = Partial<PlaybookItemInsert>

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
      follow_ups: {
        Row: FollowUpRow
        Insert: FollowUpInsert
        Update: FollowUpUpdate
      }
      campaigns: {
        Row: CampaignRow
        Insert: CampaignInsert
        Update: CampaignUpdate
      }
      conversions: {
        Row: ConversionRow
        Insert: ConversionInsert
        Update: ConversionUpdate
      }
      activities: {
        Row: ActivityRow
        Insert: ActivityInsert
        Update: ActivityUpdate
      }
      playbook_items: {
        Row: PlaybookItemRow
        Insert: PlaybookItemInsert
        Update: PlaybookItemUpdate
      }
    }
  }
}

export type Lead = LeadRow
export type User = UserRow
export type FollowUp = FollowUpRow
export type Campaign = CampaignRow
export type Conversion = ConversionRow
export type Activity = ActivityRow
export type PlaybookItem = PlaybookItemRow

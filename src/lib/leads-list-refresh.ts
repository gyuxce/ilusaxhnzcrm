import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

export const LEADS_LIST_REFRESH_KEY = 'crm_leads_list_refresh'

export function markLeadsListNeedsRefresh() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(LEADS_LIST_REFRESH_KEY, String(Date.now()))
}

export function consumeLeadsListNeedsRefresh(): boolean {
  if (typeof sessionStorage === 'undefined') return false
  const v = sessionStorage.getItem(LEADS_LIST_REFRESH_KEY)
  if (!v) return false
  sessionStorage.removeItem(LEADS_LIST_REFRESH_KEY)
  return true
}

const LEADS_SELECT = `
  *,
  users:assigned_cro_id(id, name),
  updated_by_user:updated_by(id, name),
  payments(*),
  pemetaan(*),
  expert_consultations(*)
`

export async function fetchLeadsListingClient(
  supabase: SupabaseClient<Database>,
  trialSince: string | null
) {
  let query = supabase
    .from('leads')
    .select(LEADS_SELECT)
    .order('lead_entry_date', { ascending: false })
    .limit(5000)

  if (trialSince) {
    query = query.gte('created_at', trialSince)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

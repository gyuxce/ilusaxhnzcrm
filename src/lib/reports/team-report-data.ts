/** Shared Team Report fetch — used by server page and client filter refresh. */

export const REPORT_ROW_LIMIT = 500

export type ActivityRow = {
  id: string
  lead_id: string
  activity_type: string
  description: string
  created_by: string | null
  created_at: string
  users?: { id?: string; name?: string } | null
  leads?: {
    id: string
    full_name: string
    whatsapp_number: string
    source_campaign: string
    current_status: string
  } | null
}

export type UserRow = {
  id: string
  name: string
}

export type InterventionRow = {
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
  users?: { id?: string; name?: string } | null
  leads?: {
    id: string
    full_name: string
    whatsapp_number: string
    source_campaign: string
    current_status: string
  } | null
}

type CreatedLeadRow = {
  id: string
  full_name: string
  whatsapp_number: string
  source_campaign: string
  current_status: string
  created_by: string | null
  assigned_cro_id: string | null
  created_at: string
  users?: { id?: string; name?: string } | null
  cro_user?: { id?: string; name?: string } | null
}

/** Minimal shape shared by browser + server Supabase clients. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

export function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function nextDateInput(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00+07:00`)
  date.setDate(date.getDate() + 1)
  return formatDateInput(date)
}

export type TeamReportFilters = {
  date: string
  user?: string
}

export type TeamReportPayload = {
  activities: ActivityRow[]
  interventions: InterventionRow[]
  users: UserRow[]
}

export async function fetchTeamReportData(
  supabase: SupabaseLike,
  filters: TeamReportFilters,
  options?: { includeUsers?: boolean }
): Promise<TeamReportPayload> {
  const selectedDate = filters.date
  const selectedUser = filters.user || ''
  const includeUsers = options?.includeUsers !== false
  const rangeStart = `${selectedDate}T00:00:00+07:00`
  const rangeEnd = `${nextDateInput(selectedDate)}T00:00:00+07:00`

  let activitiesQuery = supabase
    .from('lead_activities')
    .select(`
      id,
      lead_id,
      activity_type,
      description,
      created_by,
      created_at,
      users:created_by(id, name),
      leads:lead_id(id, full_name, whatsapp_number, source_campaign, current_status)
    `)
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd)
    .order('created_at', { ascending: false })
    .limit(REPORT_ROW_LIMIT)

  if (selectedUser) {
    activitiesQuery = activitiesQuery.eq('created_by', selectedUser)
  }

  let createdLeadsQuery = supabase
    .from('leads')
    .select(`
      id,
      full_name,
      whatsapp_number,
      source_campaign,
      current_status,
      created_by,
      assigned_cro_id,
      created_at,
      users:created_by(id, name),
      cro_user:assigned_cro_id(id, name)
    `)
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd)
    .order('created_at', { ascending: false })
    .limit(REPORT_ROW_LIMIT)

  if (selectedUser) {
    createdLeadsQuery = createdLeadsQuery.or(
      `created_by.eq.${selectedUser},assigned_cro_id.eq.${selectedUser}`
    )
  }

  let interventionsQuery = supabase
    .from('lead_interventions')
    .select(`
      id,
      lead_id,
      created_by,
      lead_condition,
      objection_category,
      solution_given,
      expert_needed,
      expert_type,
      commercial_type,
      service_opportunity,
      next_action,
      next_follow_up_date,
      result,
      notes,
      created_at,
      users:created_by(id, name),
      leads:lead_id(id, full_name, whatsapp_number, source_campaign, current_status)
    `)
    .gte('created_at', rangeStart)
    .lt('created_at', rangeEnd)
    .order('created_at', { ascending: false })
    .limit(REPORT_ROW_LIMIT)

  if (selectedUser) {
    interventionsQuery = interventionsQuery.eq('created_by', selectedUser)
  }

  const [activitiesRes, createdLeadsRes, interventionsRes, usersRes] = await Promise.all([
    activitiesQuery,
    createdLeadsQuery,
    interventionsQuery,
    includeUsers
      ? supabase.from('users').select('id, name').order('name', { ascending: true })
      : Promise.resolve({ data: [] as UserRow[] }),
  ])

  const activities = (activitiesRes.data || []) as ActivityRow[]
  const loggedLeadCreates = new Set(
    activities
      .filter((activity) => activity.activity_type === 'Lead created')
      .map((activity) => activity.lead_id)
  )

  const leadCreateFallbacks = ((createdLeadsRes.data || []) as CreatedLeadRow[])
    .filter((lead) => !loggedLeadCreates.has(lead.id))
    .map((lead): ActivityRow => {
      const actorId = lead.created_by || lead.assigned_cro_id || null
      const actorUser = lead.users || lead.cro_user || null
      return {
        id: `lead-created-${lead.id}`,
        lead_id: lead.id,
        activity_type: 'Lead created',
        description: 'Lead created via CRM form',
        created_by: actorId,
        created_at: lead.created_at,
        users: actorUser,
        leads: {
          id: lead.id,
          full_name: lead.full_name,
          whatsapp_number: lead.whatsapp_number,
          source_campaign: lead.source_campaign,
          current_status: lead.current_status,
        },
      }
    })

  const mergedActivities = [...activities, ...leadCreateFallbacks].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return {
    activities: mergedActivities,
    interventions: (interventionsRes.data || []) as InterventionRow[],
    users: (usersRes.data || []) as UserRow[],
  }
}

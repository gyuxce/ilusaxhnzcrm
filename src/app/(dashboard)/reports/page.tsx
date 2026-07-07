import { Header } from '@/components/layout/header'
import { TeamReportDashboard, type ActivityRow, type InterventionRow } from '@/components/reports/team-report-dashboard'
import { createClient } from '@/lib/supabase/server'
import type { UserSummary } from '@/types/crm'

export const dynamic = 'force-dynamic'

interface ReportsPageProps {
  searchParams: Promise<{
    date?: string
    user?: string
  }>
}

function formatDateInput(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function nextDateInput(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00+07:00`)
  date.setDate(date.getDate() + 1)
  return formatDateInput(date)
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
  users?: UserSummary | null
  cro_user?: UserSummary | null
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams
  const selectedDate = params.date || formatDateInput(new Date())
  const selectedUser = params.user || ''
  const supabase = await createClient()

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
    .gte('created_at', `${selectedDate}T00:00:00+07:00`)
    .lt('created_at', `${nextDateInput(selectedDate)}T00:00:00+07:00`)
    .order('created_at', { ascending: false })

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
    .gte('created_at', `${selectedDate}T00:00:00+07:00`)
    .lt('created_at', `${nextDateInput(selectedDate)}T00:00:00+07:00`)
    .order('created_at', { ascending: false })

  if (selectedUser) {
    createdLeadsQuery = createdLeadsQuery.or(`created_by.eq.${selectedUser},assigned_cro_id.eq.${selectedUser}`)
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
    .gte('created_at', `${selectedDate}T00:00:00+07:00`)
    .lt('created_at', `${nextDateInput(selectedDate)}T00:00:00+07:00`)
    .order('created_at', { ascending: false })

  if (selectedUser) {
    interventionsQuery = interventionsQuery.eq('created_by', selectedUser)
  }

  const [activitiesRes, createdLeadsRes, interventionsRes, usersRes] = await Promise.all([
    activitiesQuery,
    createdLeadsQuery,
    interventionsQuery,
    supabase
      .from('users')
      .select('id, name')
      .order('name', { ascending: true }),
  ])

  const activities = (activitiesRes.data || []) as ActivityRow[]
  const loggedLeadCreates = new Set(
    activities
      .filter(activity => activity.activity_type === 'Lead created')
      .map(activity => activity.lead_id)
  )

  const leadCreateFallbacks = ((createdLeadsRes.data || []) as CreatedLeadRow[])
    .filter(lead => !loggedLeadCreates.has(lead.id))
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

  const mergedActivities = [...activities, ...leadCreateFallbacks]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <>
      <Header title="Report Harian" subtitle="Ringkasan kerja harian otomatis dari aktivitas tim di CRM." />
      <div className="w-full p-6 animate-fade-in">
        <TeamReportDashboard
          activities={mergedActivities}
          interventions={(interventionsRes.data || []) as InterventionRow[]}
          users={(usersRes.data || []) as UserSummary[]}
          selectedDate={selectedDate}
          selectedUser={selectedUser}
        />
      </div>
    </>
  )
}

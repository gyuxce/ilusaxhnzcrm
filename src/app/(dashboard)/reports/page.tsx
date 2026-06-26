import { Header } from '@/components/layout/header'
import { TeamReportDashboard } from '@/components/reports/team-report-dashboard'
import { createClient } from '@/lib/supabase/server'

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

  const [activitiesRes, createdLeadsRes, usersRes] = await Promise.all([
    activitiesQuery,
    createdLeadsQuery,
    supabase
      .from('users')
      .select('id, name')
      .order('name', { ascending: true }),
  ])

  const activities = activitiesRes.data || []
  const loggedLeadCreates = new Set(
    activities
      .filter((activity: any) => activity.activity_type === 'Lead created')
      .map((activity: any) => activity.lead_id)
  )

  const leadCreateFallbacks = (createdLeadsRes.data || [])
    .filter((lead: any) => !loggedLeadCreates.has(lead.id))
    .map((lead: any) => {
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
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <>
      <Header title="Team Report" subtitle="Laporan aktivitas harian otomatis dari update CRM tim CRO." />
      <div className="p-6 animate-fade-in max-w-7xl mx-auto">
        <TeamReportDashboard
          activities={mergedActivities as any[]}
          users={(usersRes.data || []) as any[]}
          selectedDate={selectedDate}
          selectedUser={selectedUser}
        />
      </div>
    </>
  )
}

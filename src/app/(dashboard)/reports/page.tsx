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

  const [activitiesRes, usersRes] = await Promise.all([
    activitiesQuery,
    supabase
      .from('users')
      .select('id, name')
      .order('name', { ascending: true }),
  ])

  return (
    <>
      <Header title="Team Report" subtitle="Laporan aktivitas harian otomatis dari update CRM tim CRO." />
      <div className="p-6 animate-fade-in max-w-7xl mx-auto">
        <TeamReportDashboard
          activities={(activitiesRes.data || []) as any[]}
          users={(usersRes.data || []) as any[]}
          selectedDate={selectedDate}
          selectedUser={selectedUser}
        />
      </div>
    </>
  )
}

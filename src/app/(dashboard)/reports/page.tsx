import { Header } from '@/components/layout/header'
import { LaporanSubnav } from '@/components/layout/laporan-subnav'
import { TeamReportDashboard } from '@/components/reports/team-report-dashboard'
import {
  fetchTeamReportData,
  formatDateInput,
} from '@/lib/reports/team-report-data'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface ReportsPageProps {
  searchParams: Promise<{
    date?: string
    user?: string
  }>
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams
  const selectedDate = params.date || formatDateInput(new Date())
  const selectedUser = params.user || ''
  const supabase = await createClient()

  const { activities, interventions, users } = await fetchTeamReportData(supabase, {
    date: selectedDate,
    user: selectedUser,
  })

  return (
    <>
      <Header title="Report Harian" subtitle="Ringkasan kerja harian otomatis dari aktivitas tim di CRM." />
      <div className="w-full p-6 animate-fade-in">
        <LaporanSubnav />
        <TeamReportDashboard
          activities={activities}
          interventions={interventions}
          users={users}
          selectedDate={selectedDate}
          selectedUser={selectedUser}
        />
      </div>
    </>
  )
}

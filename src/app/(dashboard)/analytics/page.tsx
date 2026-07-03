import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const [leadsRes, paymentsRes, usersRes] = await Promise.all([
    supabase
      .from('leads')
      .select('source_campaign, current_status, lead_type, lead_entry_date, assigned_cro_id, lost_reason'),
    supabase
      .from('payments')
      .select('payment_type, amount, verification_status, payment_date')
      .eq('verification_status', 'verified'),
    supabase
      .from('users')
      .select('id, name'),
  ])

  const allLeads = leadsRes.data || []
  const payments = paymentsRes.data || []
  const users = usersRes.data || []

  return (
    <>
      <Header title="Performa" subtitle="Ringkasan hasil leads, revenue, campaign, dan kerja tim CRO." />
      <div className="w-full p-6 animate-fade-in">
        <AnalyticsDashboard
          allLeads={allLeads}
          payments={payments}
          users={users}
        />
      </div>
    </>
  )
}

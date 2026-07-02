import { Header } from '@/components/layout/header'
import { LeadsTable } from '@/components/leads/leads-table'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = await createClient()

  // Fetch leads list and pics list in parallel to avoid sequential waterfall
  const [leadsRes, picsRes] = await Promise.all([
    supabase
      .from('leads')
      .select(`
        *,
        users:assigned_cro_id(id, name),
        updated_by_user:updated_by(id, name),
        payments(*),
        pemetaan(*),
        expert_consultations(*)
      `)
      .order('lead_entry_date', { ascending: false })
      .limit(300),
    supabase
      .from('users')
      .select('id, name')
  ])

  const leads = leadsRes.data || []
  const pics = picsRes.data || []

  return (
    <>
      <Header title="Leads Table" subtitle="Daftar seluruh leads dengan filter lengkap" />
      <div className="p-6 animate-fade-in w-full">
        <LeadsTable
          initialLeads={leads || []}
          pics={pics || []}
        />
      </div>
    </>
  )
}

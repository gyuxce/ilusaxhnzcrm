import { Header } from '@/components/layout/header'
import { LeadsTable } from '@/components/leads/leads-table'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = await createClient()

  // Fetch all leads with their related payment, pemetaan, expert_consultation and user data
  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      users:assigned_cro_id(id, name),
      payments(*),
      pemetaan(*),
      expert_consultations(*)
    `)
    .order('lead_entry_date', { ascending: false })
    .limit(300)

  const { data: pics } = await supabase
    .from('users')
    .select('id, name')

  return (
    <>
      <Header title="Leads Table" subtitle="Daftar seluruh leads dengan filter lengkap" />
      <div className="p-6 animate-fade-in max-w-7xl mx-auto">
        <LeadsTable
          initialLeads={leads || []}
          pics={pics || []}
        />
      </div>
    </>
  )
}

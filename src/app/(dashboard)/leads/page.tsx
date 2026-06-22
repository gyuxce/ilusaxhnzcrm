import { Header } from '@/components/layout/header'
import { LeadsTable } from '@/components/leads/leads-table'
import { createClient } from '@/lib/supabase/server'

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      users!leads_pic_id_fkey(id, full_name),
      campaigns(id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const { data: pics } = await supabase
    .from('users')
    .select('id, full_name')
    .eq('is_active', true)

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name')
    .eq('is_active', true)

  return (
    <>
      <Header title="Leads" subtitle="Kelola semua leads inbound & outbound" />
      <div className="p-6 animate-fade-in">
        <LeadsTable
          initialLeads={leads || []}
          pics={pics || []}
          campaigns={campaigns || []}
        />
      </div>
    </>
  )
}

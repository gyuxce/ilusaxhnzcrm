import { Header } from '@/components/layout/header'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      id, full_name, whatsapp_number, source_campaign, current_status, lead_entry_date,
      lead_type, notes, assigned_cro_id,
      users:assigned_cro_id(id, name)
    `)
    .order('updated_at', { ascending: false })
    .limit(500)

  return (
    <>
      <Header title="Pipeline Board" subtitle="Visualisasi drag & drop semua lead berdasarkan stage pipeline" />
      <div className="p-6 animate-fade-in">
        <PipelineBoard initialLeads={leads || []} />
      </div>
    </>
  )
}

import { Header } from '@/components/layout/header'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import { createClient } from '@/lib/supabase/server'

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      id, name, phone_number, source, stage, inbound_date, notes,
      users!leads_pic_id_fkey(full_name)
    `)
    .order('updated_at', { ascending: false })
    .limit(300)

  return (
    <>
      <Header title="Pipeline Board" subtitle="Drag & drop leads antar stage" />
      <div className="p-6 animate-fade-in">
        <PipelineBoard initialLeads={leads || []} />
      </div>
    </>
  )
}

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
      <Header title="Pipeline Board" subtitle="Overview visual posisi lead per stage. Ini untuk monitoring, sedangkan input kerja utama tetap dari Work Queue." />
      <div className="p-6 animate-fade-in">
        <div className="mb-4 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4">
          <p className="text-sm font-extrabold text-foreground">Pipeline Board = visual overview</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Kolom di board diringkas agar mudah dipantau manager. Untuk status detail, handling, objection, follow-up, dan report harian, gunakan Work Queue.
          </p>
        </div>
        <PipelineBoard initialLeads={leads || []} />
      </div>
    </>
  )
}

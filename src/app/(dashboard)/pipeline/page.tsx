import { Header } from '@/components/layout/header'
import { PipelineBoard } from '@/components/pipeline/pipeline-board'
import { SIMPLE_FUNNEL_FLOW } from '@/lib/brand'
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
    .limit(5000)

  return (
    <>
      <Header
        title="Pipeline"
        subtitle="Tahap 1–6 = perjalanan lead. Kolom Keluar = tidak lanjut (bukan tahap 6)."
      />
      <div className="p-5 sm:p-6 animate-fade-in font-sans space-y-4">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs font-semibold text-foreground">{SIMPLE_FUNNEL_FLOW.titleId}</p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
            {SIMPLE_FUNNEL_FLOW.stepsId.join(' → ')}
          </p>
          <p className="mt-1.5 text-[11px] text-foreground/80">{SIMPLE_FUNNEL_FLOW.exitId}</p>
        </div>
        <PipelineBoard initialLeads={leads || []} />
      </div>
    </>
  )
}

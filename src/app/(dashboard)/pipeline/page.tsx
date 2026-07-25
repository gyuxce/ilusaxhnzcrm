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
    .limit(5000)

  return (
    <>
      <Header title="Pipeline" subtitle="Pantau tahap lead 1–6. Untuk input kerja harian, pakai menu Hari Ini." />
      <div className="p-6 animate-fade-in">
        <div className="mb-4 rounded-2xl border border-border bg-secondary/60 px-5 py-4">
          <p className="text-sm font-semibold text-foreground">Pipeline = pantau posisi, bukan tempat input utama</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Kolom diringkas agar mudah dipantau. Catatan chat, kendala, follow-up, dan next action dikerjakan dari Hari Ini.
          </p>
        </div>
        <PipelineBoard initialLeads={leads || []} />
      </div>
    </>
  )
}

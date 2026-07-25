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
      <Header title="Pipeline" subtitle="Pantau tahap lead 1–6. Kolom akhir: Closing berhasil vs Tidak lanjut." />
      <div className="p-6 animate-fade-in">
        <div className="mb-4 rounded-2xl border border-border bg-secondary/60 px-5 py-4">
          <p className="font-display text-base font-semibold tracking-tight text-foreground">
            Pipeline = pantau posisi (tahap 1–6)
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground font-sans">
            Status detail tetap di database. Kerja harian (chat, next action) dari menu Kerjaan.
          </p>
        </div>
        <PipelineBoard initialLeads={leads || []} />
      </div>
    </>
  )
}

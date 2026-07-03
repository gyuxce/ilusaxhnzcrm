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
      <Header title="Alur Leads" subtitle="Tampilan visual posisi lead. Ini untuk memantau alur, bukan tempat input kerja utama." />
      <div className="p-6 animate-fade-in">
        <div className="mb-4 rounded-2xl border border-primary/15 bg-primary/5 px-5 py-4">
          <p className="text-sm font-extrabold text-foreground">Alur Leads = tampilan ringkas untuk memantau posisi lead</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Kolom di sini sengaja diringkas agar mudah dipantau. Untuk kerja harian, catatan chat, kendala, follow-up, dan report, gunakan Kerjaan Hari Ini.
          </p>
        </div>
        <PipelineBoard initialLeads={leads || []} />
      </div>
    </>
  )
}

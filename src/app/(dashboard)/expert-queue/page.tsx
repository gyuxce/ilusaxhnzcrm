import { ExpertQueueDashboard, type ExpertQueueItem } from '@/components/expert-queue/expert-queue-dashboard'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function ExpertQueuePage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('lead_interventions')
    .select(`
      id,
      lead_id,
      created_by,
      lead_condition,
      objection_category,
      solution_given,
      expert_needed,
      expert_type,
      commercial_type,
      service_opportunity,
      next_action,
      next_follow_up_date,
      result,
      notes,
      created_at,
      users:created_by(id, name),
      leads:lead_id(
        id,
        full_name,
        whatsapp_number,
        source_campaign,
        current_status,
        assigned_cro_id,
        users:assigned_cro_id(id, name)
      )
    `)
    .order('created_at', { ascending: false })

  const expertItems = ((data || []) as ExpertQueueItem[]).filter(item => {
    return item.expert_needed === true || Boolean(item.expert_type)
  })

  return (
    <>
      <Header
        title="Butuh Dibantu"
        subtitle="Daftar lead yang perlu dibantu orang lain, seperti sensei, program, dokumen, atau arahan lanjutan."
      />
      <div className="p-6 animate-fade-in w-full">
        <ExpertQueueDashboard initialItems={expertItems} />
      </div>
    </>
  )
}

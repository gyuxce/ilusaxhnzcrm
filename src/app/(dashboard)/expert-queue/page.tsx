import { ExpertQueueDashboard } from '@/components/expert-queue/expert-queue-dashboard'
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
    .eq('expert_needed', true)
    .order('created_at', { ascending: false })

  return (
    <>
      <Header
        title="Expert Queue"
        subtitle="Daftar lead yang perlu bantuan expert, sensei, atau konsultasi lanjutan."
      />
      <div className="p-6 animate-fade-in w-full">
        <ExpertQueueDashboard initialItems={(data || []) as any[]} />
      </div>
    </>
  )
}

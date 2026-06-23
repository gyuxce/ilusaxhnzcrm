import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LeadDetailClient } from '@/components/leads/lead-detail-client'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const supabase = await createClient()

  // Fetch lead data
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', resolvedParams.id)
    .maybeSingle()

  if (!lead) notFound()

  // Fetch payments
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('lead_id', resolvedParams.id)
    .order('payment_date', { ascending: true })

  // Fetch pemetaan
  const { data: pemetaan } = await supabase
    .from('pemetaan')
    .select('*')
    .eq('lead_id', resolvedParams.id)

  // Fetch expert consultations
  const { data: expertConsultations } = await supabase
    .from('expert_consultations')
    .select('*')
    .eq('lead_id', resolvedParams.id)

  // Fetch activities
  const { data: activities } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', resolvedParams.id)
    .order('created_at', { ascending: false })

  // Fetch CRO list
  const { data: pics } = await supabase
    .from('users')
    .select('id, name')

  return (
    <LeadDetailClient
      initialLead={lead}
      initialPayments={payments || []}
      initialPemetaan={pemetaan || []}
      initialExpertConsultations={expertConsultations || []}
      initialActivities={activities || []}
      pics={pics || []}
    />
  )
}

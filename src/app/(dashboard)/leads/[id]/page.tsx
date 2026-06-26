import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { LeadDetailClient } from '@/components/leads/lead-detail-client'
import { Header } from '@/components/layout/header'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: PageProps) {
  const resolvedParams = await params
  const supabase = await createClient()

  // Fetch all data in parallel to avoid sequential network waterfalls
  const [leadRes, paymentsRes, pemetaanRes, expertRes, activitiesRes, picsRes, followUpsRes] = await Promise.all([
    supabase
      .from('leads')
      .select(`
        *,
        created_by_user:created_by(id, name),
        updated_by_user:updated_by(id, name)
      `)
      .eq('id', resolvedParams.id)
      .maybeSingle(),
    supabase
      .from('payments')
      .select('*')
      .eq('lead_id', resolvedParams.id)
      .order('payment_date', { ascending: true }),
    supabase
      .from('pemetaan')
      .select('*')
      .eq('lead_id', resolvedParams.id),
    supabase
      .from('expert_consultations')
      .select('*')
      .eq('lead_id', resolvedParams.id),
    supabase
      .from('lead_activities')
      .select('*, users:created_by(id, name)')
      .eq('lead_id', resolvedParams.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, name'),
    supabase
      .from('follow_ups')
      .select('*, users:pic_id(id, name)')
      .eq('lead_id', resolvedParams.id)
      .order('scheduled_date', { ascending: true })
  ])

  const lead = leadRes.data
  if (!lead) notFound()

  const payments = paymentsRes.data || []
  const pemetaan = pemetaanRes.data || []
  const expertConsultations = expertRes.data || []
  const activities = activitiesRes.data || []
  const pics = picsRes.data || []
  const followUps = followUpsRes.data || []

  return (
    <>
      <Header title="Detail Lead" subtitle={lead.full_name} backUrl="/leads" />
      <div className="animate-fade-in">
        <LeadDetailClient
          initialLead={lead}
          initialPayments={payments}
          initialPemetaan={pemetaan}
          initialExpertConsultations={expertConsultations}
          initialActivities={activities}
          initialFollowUps={followUps}
          pics={pics}
        />
      </div>
    </>
  )
}


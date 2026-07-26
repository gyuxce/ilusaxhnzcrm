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

  const [leadRes, activitiesRes, picsRes] = await Promise.all([
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
      .from('lead_activities')
      .select('*, users:created_by(id, name)')
      .eq('lead_id', resolvedParams.id)
      .order('created_at', { ascending: false }),
    supabase.from('users').select('id, name'),
  ])

  const lead = leadRes.data
  if (!lead) notFound()

  return (
    <>
      <Header title="Detail Lead" subtitle={lead.full_name} backUrl="/leads" />
      <LeadDetailClient
        initialLead={lead}
        initialPayments={[]}
        initialPemetaan={[]}
        initialExpertConsultations={[]}
        initialActivities={activitiesRes.data || []}
        initialFollowUps={[]}
        initialInterventions={[]}
        pics={picsRes.data || []}
      />
    </>
  )
}

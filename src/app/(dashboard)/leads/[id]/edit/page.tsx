import { Header } from '@/components/layout/header'
import { LeadForm } from '@/components/leads/lead-form'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  // Fetch lead and pics in parallel to prevent sequential waterfall
  const [leadRes, picsRes] = await Promise.all([
    supabase.from('leads').select('*').eq('id', resolvedParams.id).maybeSingle(),
    supabase.from('users').select('id, name')
  ])

  const lead = leadRes.data
  const pics = picsRes.data || []

  if (!lead) notFound()

  return (
    <>
      <Header title="Edit Lead" subtitle={lead.full_name || lead.whatsapp_number} backUrl={`/leads/${lead.id}`} />
      <div className="w-full p-6 animate-fade-in">
        <LeadForm
          pics={pics || []}
          leadId={lead.id}
          defaultValues={{
            whatsapp_number: lead.whatsapp_number,
            whatsapp_normalized: lead.whatsapp_normalized || undefined,
            full_name: lead.full_name,
            email: lead.email || undefined,
            source_campaign: lead.source_campaign,
            current_status: lead.current_status,
            assigned_cro_id: lead.assigned_cro_id || undefined,
            notes: lead.notes || undefined,
            lead_entry_date: lead.lead_entry_date || undefined,
            lost_reason: lead.lost_reason || undefined,
            lead_quality: lead.lead_quality || undefined,
            lead_segment: lead.lead_segment || undefined,
            entry_channel: lead.entry_channel || undefined,
            next_action: lead.next_action || undefined,
            next_follow_up_date: lead.next_follow_up_date || undefined,
            funnel_notes: lead.funnel_notes || undefined,
          }}
        />
      </div>
    </>
  )
}

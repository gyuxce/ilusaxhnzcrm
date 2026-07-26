import { Header } from '@/components/layout/header'
import { LeadForm } from '@/components/leads/lead-form'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  const [leadRes, picsRes] = await Promise.all([
    supabase.from('leads').select('*').eq('id', resolvedParams.id).maybeSingle(),
    supabase.from('users').select('id, name'),
  ])

  const lead = leadRes.data
  const pics = picsRes.data || []

  if (!lead) notFound()

  return (
    <>
      <Header title="Edit Lead" subtitle={lead.full_name || lead.whatsapp_number} backUrl={`/leads/${lead.id}`} />
      <div className="w-full p-6">
        <LeadForm
          pics={pics || []}
          leadId={lead.id}
          defaultValues={{
            whatsapp_number: lead.whatsapp_number,
            full_name: lead.full_name,
            source_campaign: lead.source_campaign,
            current_status: lead.current_status === 'New Lead' ? 'Input Manual' : lead.current_status,
            notes: lead.notes || undefined,
            lead_entry_date: lead.lead_entry_date || undefined,
            lost_reason: lead.lost_reason || undefined,
          }}
        />
      </div>
    </>
  )
}

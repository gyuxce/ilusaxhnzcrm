import { Header } from '@/components/layout/header'
import { LeadForm } from '@/components/leads/lead-form'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  const { data: lead } = await supabase.from('leads').select('*').eq('id', resolvedParams.id).single()
  const { data: pics } = await supabase.from('users').select('id, full_name').eq('is_active', true)
  const { data: campaigns } = await supabase.from('campaigns').select('id, name').eq('is_active', true)

  if (!lead) notFound()

  return (
    <>
      <Header title="Edit Lead" subtitle={lead.name || lead.phone_number} />
      <div className="p-6 max-w-2xl animate-fade-in">
        <LeadForm
          pics={pics || []}
          campaigns={campaigns || []}
          leadId={lead.id}
          defaultValues={{
            phone_number: lead.phone_number,
            name: lead.name || undefined,
            source: lead.source,
            lead_type: lead.lead_type,
            stage: lead.stage,
            pic_id: lead.pic_id || undefined,
            campaign_id: lead.campaign_id || undefined,
            notes: lead.notes || undefined,
            age: lead.age || undefined,
            education: lead.education || undefined,
            inbound_date: lead.inbound_date || undefined,
          }}
        />
      </div>
    </>
  )
}

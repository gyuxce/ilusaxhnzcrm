import { Header } from '@/components/layout/header'
import { LeadForm } from '@/components/leads/lead-form'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  const { data: lead } = await supabase.from('leads').select('*').eq('id', resolvedParams.id).single()
  const { data: pics } = await supabase.from('users').select('id, name')

  if (!lead) notFound()

  return (
    <>
      <Header title="Edit Lead" subtitle={lead.full_name || lead.whatsapp_number} />
      <div className="p-6 max-w-2xl animate-fade-in">
        <LeadForm
          pics={pics || []}
          leadId={lead.id}
          defaultValues={{
            whatsapp_number: lead.whatsapp_number,
            full_name: lead.full_name,
            email: lead.email || undefined,
            source_campaign: lead.source_campaign,
            current_status: lead.current_status,
            assigned_cro_id: lead.assigned_cro_id || undefined,
            notes: lead.notes || undefined,
            lead_entry_date: lead.lead_entry_date || undefined,
          }}
        />
      </div>
    </>
  )
}

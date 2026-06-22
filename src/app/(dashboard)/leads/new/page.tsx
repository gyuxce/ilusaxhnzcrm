import { Header } from '@/components/layout/header'
import { LeadForm } from '@/components/leads/lead-form'
import { createClient } from '@/lib/supabase/server'

export default async function NewLeadPage() {
  const supabase = await createClient()

  const [{ data: pics }, { data: campaigns }] = await Promise.all([
    supabase.from('users').select('id, full_name').eq('is_active', true),
    supabase.from('campaigns').select('id, name').eq('is_active', true),
  ])

  return (
    <>
      <Header title="Tambah Lead Baru" subtitle="Input data lead inbound atau outbound" />
      <div className="p-6 max-w-2xl animate-fade-in">
        <LeadForm pics={pics || []} campaigns={campaigns || []} />
      </div>
    </>
  )
}

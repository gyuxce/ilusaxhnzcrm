import { Header } from '@/components/layout/header'
import { LeadForm } from '@/components/leads/lead-form'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function NewLeadPage() {
  const supabase = await createClient()

  const { data: pics } = await supabase
    .from('users')
    .select('id, name')

  return (
    <>
      <Header title="Tambah Lead Baru" subtitle="Input data lead inbound untuk tim CRO" backUrl="/leads" />
      <div className="p-6 max-w-4xl animate-fade-in mx-auto">
        <LeadForm pics={pics || []} />
      </div>
    </>
  )
}

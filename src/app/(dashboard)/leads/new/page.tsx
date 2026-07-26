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
      <Header title="Tambah Lead Manual" subtitle="Input dari WhatsApp — status otomatis Input Manual" backUrl="/leads" />
      <div className="w-full p-6">
        <LeadForm pics={pics || []} />
      </div>
    </>
  )
}

import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { LeadsTable } from '@/components/leads/leads-table'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = await createClient()

  // Keep the initial table payload bounded; large imports should not force
  // the browser to receive and render the entire database at once.
  const [leadsRes, picsRes] = await Promise.all([
    supabase
      .from('leads')
      .select(`
        *,
        users:assigned_cro_id(id, name),
        updated_by_user:updated_by(id, name),
        payments(*),
        pemetaan(*),
        expert_consultations(*)
      `)
      .order('lead_entry_date', { ascending: false })
      .limit(5000),
    supabase
      .from('users')
      .select('id, name, email')
  ])

  const leads = leadsRes.data || []
  const pics = picsRes.data || []

  return (
    <>
      <Header
        title="Leads"
        subtitle="Data master lead — cek, import CSV, edit. Klik Kerjakan untuk mulai Stage 1."
      />
      <div className="p-5 sm:p-6 animate-fade-in w-full font-sans">
        <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Memuat data leads...</div>}>
          <LeadsTable
            initialLeads={leads || []}
            pics={pics || []}
          />
        </Suspense>
      </div>
    </>
  )
}

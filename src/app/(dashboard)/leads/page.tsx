import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { LeadsTable } from '@/components/leads/leads-table'
import { createClient } from '@/lib/supabase/server'
import { getPrdTrialSince } from '@/app/actions/prd-trial-mode'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = await createClient()
  const trialSince = await getPrdTrialSince()

  let leadsQuery = supabase
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
      .limit(5000)
  if (trialSince) {
    leadsQuery = leadsQuery.gte('created_at', trialSince)
  }

  const [leadsRes, picsRes] = await Promise.all([
    leadsQuery,
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

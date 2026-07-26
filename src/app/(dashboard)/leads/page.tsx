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
        updated_by_user:updated_by(id, name)
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
  const loadError = leadsRes.error?.message

  return (
    <>
      <Header
        title="Leads"
        subtitle="Data master — import CSV / tambah manual. Kerjakan untuk Stage 1."
      />
      <div className="p-5 sm:p-6 w-full font-sans">
        {loadError && (
          <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-2 text-xs font-medium text-destructive">
            Gagal memuat leads: {loadError}
          </div>
        )}
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

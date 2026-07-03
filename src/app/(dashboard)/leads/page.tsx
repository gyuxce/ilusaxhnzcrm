import { Header } from '@/components/layout/header'
import { LeadsTable } from '@/components/leads/leads-table'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = await createClient()

  // Fetch leads list and pics list in parallel to avoid sequential waterfall
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
      .limit(300),
    supabase
      .from('users')
      .select('id, name, email')
  ])

  const leads = leadsRes.data || []
  const pics = picsRes.data || []

  return (
    <>
      <Header title="Database Leads" subtitle="Tempat mencari, import, edit, dan audit semua data lead. Kerja harian CRO dilakukan dari Work Queue." />
      <div className="p-6 animate-fade-in w-full">
        <div className="mb-4 rounded-2xl border border-blue-500/15 bg-blue-500/5 px-5 py-4">
          <p className="text-sm font-extrabold text-foreground">Leads = database, bukan meja kerja harian</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Pakai halaman ini untuk cek data, cari histori, import CSV, atau edit detail lead. Untuk menghubungi lead, catat objection, dan menentukan next action, buka Work Queue.
          </p>
        </div>
        <LeadsTable
          initialLeads={leads || []}
          pics={pics || []}
        />
      </div>
    </>
  )
}

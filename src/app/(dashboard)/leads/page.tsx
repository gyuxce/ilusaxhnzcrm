import { Header } from '@/components/layout/header'
import { LeadsTable } from '@/components/leads/leads-table'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const supabase = await createClient()

  // Fetch enough rows for client-side filters after large CSV imports.
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
      .limit(2000),
    supabase
      .from('users')
      .select('id, name, email')
  ])

  const leads = leadsRes.data || []
  const pics = picsRes.data || []

  return (
    <>
      <Header title="Data Leads" subtitle="Tempat cek, import, edit, dan hapus data lead. Kerja harian tetap dari Kerjaan Hari Ini." />
      <div className="p-6 animate-fade-in w-full">
        <div className="mb-4 rounded-2xl border border-blue-500/15 bg-blue-500/5 px-5 py-4">
          <p className="text-sm font-extrabold text-foreground">Data Leads = tempat cek data, bukan tempat kerja harian</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Pakai halaman ini untuk cek histori, import CSV, edit, atau hapus data. Untuk menghubungi lead, mencatat kendala, dan menentukan langkah berikutnya, buka Kerjaan Hari Ini.
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

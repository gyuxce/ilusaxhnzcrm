import { Suspense } from 'react'
import { Header } from '@/components/layout/header'
import { Stage3Board } from '@/components/stage3/stage3-board'
import { createClient } from '@/lib/supabase/server'
import { STAGE3_BOARD_COLUMNS } from '@/lib/prd-stages'
import { getPrdTrialSince } from '@/app/actions/prd-trial-mode'

export const dynamic = 'force-dynamic'

const STAGE3_STATUSES = STAGE3_BOARD_COLUMNS.flatMap((c) => c.statuses as readonly string[])

export default async function Stage3Page() {
  const supabase = await createClient()
  const trialSince = await getPrdTrialSince()

  let query = supabase
    .from('leads')
    .select(`
      id, full_name, whatsapp_number, source_campaign, current_status,
      lead_entry_date, last_contacted_date, updated_at, notes, funnel_notes, lost_reason,
      expert_consultations(id, expert_name, consultation_result, recommendation, next_step, scheduled_at, completed_at, updated_at),
      users:assigned_cro_id(id, name)
    `)
    .in('current_status', STAGE3_STATUSES)
    .order('updated_at', { ascending: false })
    .limit(5000)

  if (trialSince) {
    query = query.gte('created_at', trialSince)
  }

  const { data } = await query
  const leads = data || []

  return (
    <>
      <Header
        title="Stage 3"
        subtitle="Pemetaan -> expert -> seat lock -> closing. Geser kartu untuk pindah tahap, klik Detail untuk update."
      />
      <div className="p-4 sm:p-5 animate-fade-in w-full font-sans">
        <Suspense fallback={<div className="p-8 text-center text-xs text-muted-foreground animate-pulse">Memuat Stage 3...</div>}>
          <Stage3Board initialLeads={leads as never} />
        </Suspense>
      </div>
    </>
  )
}

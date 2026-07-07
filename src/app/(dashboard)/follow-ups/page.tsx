import { Header } from '@/components/layout/header'
import { FollowUpTracker } from '@/components/follow-ups/follow-up-tracker'
import { createClient } from '@/lib/supabase/server'
import { getTodayInWIB } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function FollowUpsPage() {
  const supabase = await createClient()
  const today = getTodayInWIB()

  const [dueRes, upcomingRes] = await Promise.all([
    supabase
      .from('follow_ups')
      .select(`*, leads(id, full_name, whatsapp_number, current_status, source_campaign), users:pic_id(name)`)
      .eq('is_done', false)
      .lte('scheduled_date', today)
      .order('scheduled_date', { ascending: true })
      .limit(100),

    supabase
      .from('follow_ups')
      .select(`*, leads(id, full_name, whatsapp_number, current_status, source_campaign), users:pic_id(name)`)
      .eq('is_done', false)
      .gt('scheduled_date', today)
      .order('scheduled_date', { ascending: true })
      .limit(50),
  ])

  const dueFUs = dueRes.data || []
  const upcomingFUs = upcomingRes.data || []

  return (
    <>
      <Header
        title="Follow-Up Tracker"
        subtitle={`${dueFUs.length} FU yang harus diselesaikan hari ini`}
      />
      <div className="p-6 animate-fade-in">
        <FollowUpTracker dueFUs={dueFUs} upcomingFUs={upcomingFUs} />
      </div>
    </>
  )
}

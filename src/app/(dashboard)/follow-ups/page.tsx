import { Header } from '@/components/layout/header'
import { FollowUpTracker } from '@/components/follow-ups/follow-up-tracker'
import { createClient } from '@/lib/supabase/server'

export default async function FollowUpsPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: dueFUs } = await supabase
    .from('follow_ups')
    .select(`
      *,
      leads(id, name, phone_number, stage, source),
      users!follow_ups_pic_id_fkey(full_name)
    `)
    .eq('is_done', false)
    .lte('scheduled_date', today)
    .order('scheduled_date', { ascending: true })
    .limit(100)

  const { data: upcomingFUs } = await supabase
    .from('follow_ups')
    .select(`
      *,
      leads(id, name, phone_number, stage, source),
      users!follow_ups_pic_id_fkey(full_name)
    `)
    .eq('is_done', false)
    .gt('scheduled_date', today)
    .order('scheduled_date', { ascending: true })
    .limit(50)

  return (
    <>
      <Header
        title="Follow-Up Tracker"
        subtitle={`${dueFUs?.length || 0} FU yang harus dilakukan hari ini`}
      />
      <div className="p-6 animate-fade-in">
        <FollowUpTracker dueFUs={dueFUs || []} upcomingFUs={upcomingFUs || []} />
      </div>
    </>
  )
}

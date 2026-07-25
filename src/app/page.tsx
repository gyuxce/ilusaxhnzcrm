import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isOwnerLikeRole } from '@/lib/brand'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (isOwnerLikeRole(profile?.role)) {
    redirect('/stage-3')
  }

  redirect('/leads')
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .maybeSingle()

    if (profile?.role !== 'admin' && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
    }

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')

    const { data: activities, error: activitiesError } = await supabase
      .from('lead_activities')
      .select(`
        *,
        users:created_by(id, name),
        leads:lead_id(id, full_name, whatsapp_number, source_campaign, current_status)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, full_name, created_by, assigned_cro_id, created_at, lead_entry_date')
      .order('created_at', { ascending: false })
      .limit(10)

    const errors = [usersError, activitiesError, leadsError].filter(Boolean)
    if (errors.length > 0) {
      return NextResponse.json({
        ok: false,
        error: errors[0]?.message || 'Query failed',
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      currentUser: authUser,
      users,
      activities,
      leads,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

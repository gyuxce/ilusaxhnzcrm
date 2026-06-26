import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current auth user
    const { data: { user: authUser } } = await supabase.auth.getUser()
    
    // Get all users
    const { data: users } = await supabase
      .from('users')
      .select('*')
      
    // Get latest 50 activities
    const { data: activities } = await supabase
      .from('lead_activities')
      .select(`
        *,
        users:created_by(id, name),
        leads:lead_id(id, full_name, whatsapp_number, source_campaign, current_status)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    // Get latest 10 leads
    const { data: leads } = await supabase
      .from('leads')
      .select('id, full_name, created_by, assigned_cro_id, created_at, lead_entry_date')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      ok: true,
      currentUser: authUser,
      users,
      activities,
      leads
    })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message })
  }
}

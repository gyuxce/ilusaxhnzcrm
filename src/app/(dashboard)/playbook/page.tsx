import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { PlaybookView } from '@/components/playbook/playbook-view'

export default async function PlaybookPage() {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('playbook_items')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })

  return (
    <>
      <Header title="Playbook" subtitle="Script, SOP, dan Product Knowledge tim CRO" />
      <div className="p-6 animate-fade-in">
        <PlaybookView items={items || []} />
      </div>
    </>
  )
}

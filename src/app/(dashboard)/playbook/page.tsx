import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { PlaybookView } from '@/components/playbook/playbook-view'

export const dynamic = 'force-dynamic'

export default async function PlaybookPage() {
  const supabase = await createClient()

  const { data: items } = await supabase
    .from('playbook_items')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true })

  return (
    <>
      <Header title="Playbook CRO" subtitle="Script, SOP, Objection Handling & Product Knowledge tim Harunokaze" />
      <div className="p-6 animate-fade-in max-w-7xl mx-auto">
        <PlaybookView items={items || []} />
      </div>
    </>
  )
}

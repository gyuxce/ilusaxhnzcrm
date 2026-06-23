import { Sidebar } from '@/components/layout/sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Middleware (proxy.ts) already handles auth guard for all routes.
  // This is a lightweight fallback check only.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="min-h-screen lg:pl-[260px] pt-[64px]">
        {children}
      </main>
    </div>
  )
}

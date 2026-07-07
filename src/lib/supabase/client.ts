import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  const client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  // Manual Database types omit generated Relationships; cast keeps query/RPC inference usable.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return client as any
}

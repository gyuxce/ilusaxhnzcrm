import type { Json } from '@/lib/supabase/types'

export type RpcResult = {
  ok: boolean
  code?: string
  message?: string
  id?: string
  duplicate_lead?: Json
}

export function parseRpcResult(data: Json | null | undefined): RpcResult | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  return data as RpcResult
}

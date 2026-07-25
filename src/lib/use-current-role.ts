'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { isOwnerLikeRole, type UserRole } from '@/lib/brand'

export function useCurrentRole() {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) {
          setRole(null)
          setLoading(false)
        }
        return
      }
      const { data } = await supabase.from('users').select('role').eq('id', user.id).maybeSingle()
      if (!cancelled) {
        setRole((data?.role as UserRole) || 'cro')
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [supabase])

  return {
    role,
    loading,
    isOwnerLike: isOwnerLikeRole(role),
    isCro: role === 'cro' || role === null,
  }
}

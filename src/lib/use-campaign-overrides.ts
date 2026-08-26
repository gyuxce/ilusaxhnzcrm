'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Entity } from '@/lib/entity'

/** Fetches campaign_entity_overrides once and exposes it as a lookup map. */
export function useCampaignOverrides(): ReadonlyMap<string, Entity> {
  const [overrides, setOverrides] = useState<ReadonlyMap<string, Entity>>(new Map())

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('campaign_entity_overrides')
      .select('source_campaign, entity')
      .then(({ data }: { data: { source_campaign: string; entity: string }[] | null }) => {
        setOverrides(new Map((data || []).map((o) => [o.source_campaign, o.entity as Entity])))
      })
  }, [])

  return overrides
}

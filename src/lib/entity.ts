/**
 * Business entity attribution.
 *
 * source_campaign is free text (no dropdown at lead creation), so campaign
 * names vary and can't be trusted to always contain a predictable keyword.
 * The source of truth is `campaign_entity_overrides` — an admin-managed
 * table (Settings → Campaign) mapping each campaign name that has actually
 * appeared to HNZ or KFI. getEntityForCampaign's keyword guess is only a
 * fallback for a campaign that hasn't been assigned there yet, so nothing
 * silently disappears from the dashboard while waiting to be classified.
 */

export type Entity = 'HNZ' | 'KFI'

export const ENTITIES: readonly Entity[] = ['HNZ', 'KFI']

const KFI_CAMPAIGN_KEYWORDS = ['driver']

/** Fallback guess for a campaign not yet listed in campaign_entity_overrides. */
export function getEntityForCampaign(sourceCampaign: string | null | undefined): Entity {
  const campaign = (sourceCampaign ?? '').toLowerCase()
  const isKfi = KFI_CAMPAIGN_KEYWORDS.some((keyword) => campaign.includes(keyword))
  return isKfi ? 'KFI' : 'HNZ'
}

/** Explicit override (from campaign_entity_overrides) wins; else fall back to the keyword guess. */
export function resolveEntity(
  sourceCampaign: string | null | undefined,
  overrides: ReadonlyMap<string, Entity>
): Entity {
  return overrides.get(sourceCampaign ?? '') ?? getEntityForCampaign(sourceCampaign)
}

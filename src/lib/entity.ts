/**
 * Business entity attribution.
 *
 * Campaigns run by the KFI partner (currently just "Program Driver Jepang")
 * get attributed to KFI instead of Harunokaze (HNZ) so revenue/lead counts
 * aren't lumped together. Match by keyword so future driver-program
 * campaigns are picked up automatically without a code change.
 */

export type Entity = 'HNZ' | 'KFI'

export const ENTITIES: readonly Entity[] = ['HNZ', 'KFI']

const KFI_CAMPAIGN_KEYWORDS = ['driver']

export function getEntityForCampaign(sourceCampaign: string | null | undefined): Entity {
  const campaign = (sourceCampaign ?? '').toLowerCase()
  const isKfi = KFI_CAMPAIGN_KEYWORDS.some((keyword) => campaign.includes(keyword))
  return isKfi ? 'KFI' : 'HNZ'
}

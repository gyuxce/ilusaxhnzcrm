import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'

type CampaignRow = {
  id: string
  name: string
  type: string
  batch: string | null
  event_date: string | null
  description: string | null
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: rawCampaigns } = await supabase
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  const campaigns = (rawCampaigns || []) as CampaignRow[]
  const campaignIds = campaigns.map(c => c.id)

  let countMap: Record<string, number> = {}
  if (campaignIds.length > 0) {
    const { data: leadCounts } = await supabase
      .from('leads')
      .select('campaign_id')
      .in('campaign_id', campaignIds)

    countMap = (leadCounts || []).reduce((acc: Record<string, number>, l: { campaign_id: string | null }) => {
      if (l.campaign_id) acc[l.campaign_id] = (acc[l.campaign_id] || 0) + 1
      return acc
    }, {})
  }

  const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
    webinar: { label: 'Webinar', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', emoji: '🎓' },
    ads_ig: { label: 'Ads IG', color: '#f97316', bg: 'rgba(249,115,22,0.15)', emoji: '📸' },
    ads_fb: { label: 'Ads FB', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', emoji: '📘' },
    organic: { label: 'Organic', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', emoji: '🌱' },
    event: { label: 'Event', color: '#eab308', bg: 'rgba(234,179,8,0.15)', emoji: '🗓️' },
  }

  return (
    <>
      <Header title="Campaign" subtitle="Kelola campaign dan event" />
      <div className="p-6 animate-fade-in space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-white/50">{campaigns.length} campaign aktif</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(campaign => {
            const typeConf = TYPE_CONFIG[campaign.type] || {
              label: campaign.type, color: '#64748b', bg: 'rgba(100,116,139,0.15)', emoji: '📋'
            }
            const leadCount = countMap[campaign.id] || 0

            return (
              <div
                key={campaign.id}
                className="glass-card rounded-2xl p-5 hover:scale-[1.01] transition-transform"
                style={{ border: `1px solid ${typeConf.color}20` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: typeConf.bg }}
                  >
                    {typeConf.emoji}
                  </div>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: typeConf.bg, color: typeConf.color }}
                  >
                    {typeConf.label}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white mb-1">{campaign.name}</h3>
                {campaign.batch && (
                  <p className="text-xs text-white/40 mb-2">{campaign.batch}</p>
                )}
                {campaign.description && (
                  <p className="text-xs text-white/40 mb-3 line-clamp-2">{campaign.description}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div>
                    <p className="text-lg font-bold text-white">{leadCount}</p>
                    <p className="text-xs text-white/30">leads</p>
                  </div>
                  {campaign.event_date && (
                    <div className="text-right">
                      <p className="text-xs text-white/30">Tanggal</p>
                      <p className="text-xs text-white/60">{formatDate(campaign.event_date)}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {campaigns.length === 0 && (
            <div className="col-span-3 glass-card rounded-2xl p-12 text-center">
              <div className="text-4xl mb-3">📣</div>
              <p className="text-white/60 font-medium">Belum ada campaign</p>
              <p className="text-sm text-white/30 mt-1">
                Campaign akan muncul setelah database Supabase terhubung
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

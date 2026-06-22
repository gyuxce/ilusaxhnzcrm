import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

type LeadRow = { source: string; stage: string; lead_type: string; created_at: string }
type RejRow = { rejection_reason: string | null }

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const [leadsRes, conversionsRes, rejectionsRes] = await Promise.all([
    supabase.from('leads').select('source, stage, lead_type, created_at'),
    supabase.from('leads').select('source, created_at').eq('stage', 'converted'),
    supabase.from('leads').select('rejection_reason').eq('stage', 'rejected').not('rejection_reason', 'is', null),
  ])

  const allLeads = (leadsRes.data || []) as LeadRow[]
  const conversions = conversionsRes.data || []
  const rejections = (rejectionsRes.data || []) as RejRow[]

  // By source
  const bySource = allLeads.reduce((acc: Record<string, number>, l) => {
    acc[l.source] = (acc[l.source] || 0) + 1
    return acc
  }, {})

  // By stage
  const byStage = (allLeads || []).reduce((acc: Record<string, number>, l) => {
    acc[l.stage] = (acc[l.stage] || 0) + 1
    return acc
  }, {})

  // Weekly trend (last 8 weeks)
  const weeklyData: Record<string, { total: number; converted: number }> = {}
  const now = new Date()
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const key = `W${i === 0 ? 'Ini' : i}`
    weeklyData[key] = { total: 0, converted: 0 }
  }

  // Rejection reasons
  const rejReasons = (rejections || []).reduce((acc: Record<string, number>, r) => {
    const reason = r.rejection_reason || 'Tidak diketahui'
    acc[reason] = (acc[reason] || 0) + 1
    return acc
  }, {})

  const topRejReasons = Object.entries(rejReasons)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <>
      <Header title="Analytics" subtitle="Insight performa tim CRO" />
      <div className="p-6 animate-fade-in">
        <AnalyticsDashboard
          bySource={bySource}
          byStage={byStage}
          totalLeads={allLeads?.length || 0}
          totalConverted={conversions?.length || 0}
          topRejReasons={topRejReasons}
        />
      </div>
    </>
  )
}

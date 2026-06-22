import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import {
  Users, Phone, TrendingUp, CheckSquare,
  ArrowUpRight, ArrowDownRight, Clock,
  Flame, Target, BarChart3, MessageCircle
} from 'lucide-react'
import { generateWALink } from '@/lib/utils'
import { WhatsAppButton } from '@/components/leads/WhatsAppButton'

async function getDashboardStats() {
  const supabase = await createClient()

  // Parallel queries
  const totalLeadsRes = await supabase.from('leads').select('*', { count: 'exact', head: true })
  const hotLeadsRes = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('stage', 'hot')
  const conversionsRes = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('stage', 'converted')
  const dueFuTodayRes = await supabase.from('follow_ups').select('*', { count: 'exact', head: true })
    .eq('is_done', false)
    .lte('scheduled_date', new Date().toISOString().split('T')[0])
  const recentLeadsRes = await supabase.from('leads').select('id, name, phone_number, source, stage, inbound_date')
    .order('created_at', { ascending: false }).limit(5)
  const stageStatsRes = await supabase.from('leads').select('stage')
  const dueFUsRes = await supabase.from('follow_ups')
    .select(`
      id,
      fu_type,
      scheduled_date,
      leads(id, name, phone_number, stage)
    `)
    .eq('is_done', false)
    .lte('scheduled_date', new Date().toISOString().split('T')[0])
    .order('scheduled_date', { ascending: true })
    .limit(5)

  const totalLeads = totalLeadsRes.count
  const hotLeads = hotLeadsRes.count
  const conversions = conversionsRes.count
  const dueFuToday = dueFuTodayRes.count
  const recentLeads = recentLeadsRes.data as any
  const stageStats = stageStatsRes.data as any
  const dueFUs = dueFUsRes.data as any

  // Count by stage
  const stageCounts = (stageStats || []).reduce((acc: Record<string, number>, lead: any) => {
    acc[lead.stage] = (acc[lead.stage] || 0) + 1
    return acc
  }, {})

  return { totalLeads, hotLeads, conversions, dueFuToday, recentLeads, stageCounts, dueFUs }
}

const STAGE_CONFIG = {
  new: { label: 'Baru', color: '#64748b', bg: 'rgba(100,116,139,0.15)' },
  probing: { label: 'Probing', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  hot: { label: 'Hot', color: '#f97316', bg: 'rgba(249,115,22,0.15)' },
  potential: { label: 'Potensial', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  converted: { label: 'Konversi', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  rejected: { label: 'Reject', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
}

const SOURCE_ICONS: Record<string, string> = {
  ig: '📸', fb: '📘', linkedin: '💼', webinar: '🎓', manual: '✍️', referral: '🤝', other: '📌'
}

export default async function DashboardPage() {
  const { totalLeads, hotLeads, conversions, dueFuToday, recentLeads, stageCounts, dueFUs } = await getDashboardStats()

  const conversionRate = totalLeads ? ((conversions || 0) / totalLeads * 100).toFixed(1) : '0'

  const stats = [
    {
      label: 'Total Leads',
      value: totalLeads?.toLocaleString('id-ID') || '0',
      icon: Users,
      color: '#8b5cf6',
      bg: 'rgba(139,92,246,0.15)',
      trend: '+12%',
      up: true,
    },
    {
      label: 'Hot Leads',
      value: hotLeads?.toLocaleString('id-ID') || '0',
      icon: Flame,
      color: '#f97316',
      bg: 'rgba(249,115,22,0.15)',
      trend: '+5%',
      up: true,
    },
    {
      label: 'FU Hari Ini',
      value: dueFuToday?.toLocaleString('id-ID') || '0',
      icon: Clock,
      color: '#eab308',
      bg: 'rgba(234,179,8,0.15)',
      trend: 'Due today',
      up: null,
    },
    {
      label: 'Konversi',
      value: conversions?.toLocaleString('id-ID') || '0',
      icon: CheckSquare,
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.15)',
      trend: `${conversionRate}% rate`,
      up: null,
    },
  ]

  return (
    <>
      <Header title="Dashboard" subtitle={`Selamat datang kembali 👋`} />
      <div className="p-6 space-y-6 animate-fade-in">

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="glass-card rounded-2xl p-5 hover:scale-[1.02] transition-transform duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: stat.bg }}
                  >
                    <Icon size={18} style={{ color: stat.color }} />
                  </div>
                  <span className="flex items-center gap-1 text-xs font-medium"
                    style={{ color: stat.up === true ? '#22c55e' : stat.up === false ? '#ef4444' : '#64748b' }}
                  >
                    {stat.up === true && <ArrowUpRight size={12} />}
                    {stat.up === false && <ArrowDownRight size={12} />}
                    {stat.trend}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-white/40 mt-1">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Pipeline Funnel + Recent Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Pipeline Funnel */}
          <div className="glass-card rounded-2xl p-5 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Target size={16} className="text-purple-400" />
              <h2 className="text-sm font-semibold text-white">Pipeline Funnel</h2>
            </div>
            <div className="space-y-2">
              {Object.entries(STAGE_CONFIG).map(([stage, config]) => {
                const count = stageCounts[stage] || 0
                const total = totalLeads || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: config.color }}>{config.label}</span>
                      <span className="text-white/50">{count} leads</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(222,47%,14%)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: config.color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Follow-Up Hari Ini */}
          <div className="glass-card rounded-2xl p-5 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-purple-400" />
                <h2 className="text-sm font-semibold text-white">FU Hari Ini / Overdue</h2>
              </div>
              <a href="/follow-ups" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                Lihat semua →
              </a>
            </div>
            <div className="space-y-3">
              {(dueFUs || []).length === 0 ? (
                <p className="text-sm text-white/30 text-center py-8">Tidak ada follow-up hari ini. 👍</p>
              ) : (
                dueFUs.map((fu: any) => {
                  const lead = fu.leads
                  if (!lead) return null
                  const stageConfig = STAGE_CONFIG[lead.stage as keyof typeof STAGE_CONFIG] || STAGE_CONFIG.new
                  return (
                    <div
                      key={fu.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <a href={`/leads/${lead.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: stageConfig.bg, color: stageConfig.color }}
                        >
                          {(lead.name || '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                            {lead.name || 'Tanpa Nama'}
                          </p>
                          <p className="text-xs text-white/40 font-mono truncate">{lead.phone_number}</p>
                        </div>
                      </a>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold uppercase">
                          {fu.fu_type}
                        </span>
                        <WhatsAppButton
                          leadName={lead.name || 'Tanpa Nama'}
                          leadPhone={lead.phone_number}
                          iconOnly
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Recent Leads */}
          <div className="glass-card rounded-2xl p-5 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-purple-400" />
                <h2 className="text-sm font-semibold text-white">Leads Terbaru</h2>
              </div>
              <a href="/leads" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                Lihat semua →
              </a>
            </div>
            <div className="space-y-3">
              {(recentLeads || []).length === 0 ? (
                <p className="text-sm text-white/30 text-center py-8">Belum ada leads. Tambahkan leads pertama!</p>
              ) : (
                recentLeads!.map((lead: any) => {
                  const stageConfig = STAGE_CONFIG[lead.stage as keyof typeof STAGE_CONFIG] || STAGE_CONFIG.new
                  return (
                    <a
                      key={lead.id}
                      href={`/leads/${lead.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 transition-colors group"
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ background: stageConfig.bg, color: stageConfig.color }}
                      >
                        {(lead.name || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate group-hover:text-purple-300 transition-colors">
                          {lead.name || 'Tanpa Nama'}
                        </p>
                        <p className="text-xs text-white/40">{lead.phone_number}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-sm">{SOURCE_ICONS[lead.source] || '📌'}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: stageConfig.bg, color: stageConfig.color }}
                        >
                          {stageConfig.label}
                        </span>
                      </div>
                    </a>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-purple-400" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { href: '/leads/new', label: 'Tambah Lead', emoji: '➕', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
              { href: '/follow-ups', label: 'Lihat FU Hari Ini', emoji: '📞', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
              { href: '/pipeline', label: 'Pipeline Board', emoji: '🗂️', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
              { href: '/playbook', label: 'Buka Playbook', emoji: '📋', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
            ].map((action) => (
              <a
                key={action.href}
                href={action.href}
                className="flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all duration-200 hover:scale-[1.03]"
                style={{ background: action.bg, border: `1px solid ${action.color}25` }}
              >
                <span className="text-2xl">{action.emoji}</span>
                <span className="text-xs font-medium" style={{ color: action.color }}>{action.label}</span>
              </a>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}

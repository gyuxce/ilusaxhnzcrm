'use client'

import { useMemo } from 'react'
import { TrendingUp, Users, DollarSign, Award, Target, BarChart3, AlertCircle } from 'lucide-react'

const PIPELINE_STAGES = [
  'New Lead', 'Interested', 'Payment Pemetaan Pending', 'Payment Pemetaan Paid',
  'Pemetaan Form Submitted', 'Pemetaan Scheduled', 'Pemetaan Done',
  'Waiting Result', 'Result Ready', 'Expert Consultation Scheduled',
  'Expert Consultation Done', 'Seat Lock Offered', 'Seat Lock Paid',
  'Onboarding', 'Class Started',
]
const LOST_STAGES = ['Not Interested', 'No Response', 'Need Follow Up Later', 'Failed Closing', 'Not Qualified']

const STAGE_COLORS: Record<string, string> = {
  'New Lead': '#64748b',
  'Interested': '#3b82f6',
  'Payment Pemetaan Paid': '#8b5cf6',
  'Pemetaan Done': '#f59e0b',
  'Expert Consultation Done': '#10b981',
  'Seat Lock Paid': '#22c55e',
  'Onboarding': '#06b6d4',
  'Class Started': '#2563eb',
}

interface AnalyticsDashboardProps {
  allLeads: { source_campaign: string; current_status: string; lead_type: string; lead_entry_date: string; assigned_cro_id: string | null; lost_reason: string | null }[]
  payments: { payment_type: string; amount: number; verification_status: string; payment_date: string }[]
  users: { id: string; name: string }[]
}

export function AnalyticsDashboard({ allLeads, payments, users }: AnalyticsDashboardProps) {
  const stats = useMemo(() => {
    const total = allLeads.length
    const inbound = allLeads.filter(l => l.lead_type === 'inbound').length
    const outbound = allLeads.filter(l => l.lead_type === 'outbound').length
    const seatLockPaid = allLeads.filter(l => l.current_status === 'Seat Lock Paid' || l.current_status === 'Onboarding' || l.current_status === 'Class Started').length
    const lost = allLeads.filter(l => LOST_STAGES.includes(l.current_status)).length
    const convRate = total > 0 ? ((seatLockPaid / total) * 100).toFixed(1) : '0.0'

    // Revenue
    let revPemetaan = 0, revSeatLock = 0
    payments.forEach(p => {
      if (p.payment_type === 'pemetaan' || p.payment_type === 'roadmap_session') revPemetaan += Number(p.amount)
      else if (p.payment_type === 'seat_lock') revSeatLock += Number(p.amount)
    })

    // By source
    const bySource: Record<string, number> = {}
    allLeads.forEach(l => {
      bySource[l.source_campaign] = (bySource[l.source_campaign] || 0) + 1
    })

    // By stage
    const byStage: Record<string, number> = {}
    allLeads.forEach(l => {
      byStage[l.current_status] = (byStage[l.current_status] || 0) + 1
    })

    // Lost reasons
    const lostReasons: Record<string, number> = {}
    allLeads.filter(l => l.lost_reason).forEach(l => {
      lostReasons[l.lost_reason!] = (lostReasons[l.lost_reason!] || 0) + 1
    })

    // CRO leaderboard
    const croLeaderboard: Record<string, number> = {}
    allLeads.filter(l => l.current_status === 'Seat Lock Paid' || l.current_status === 'Onboarding').forEach(l => {
      if (l.assigned_cro_id) croLeaderboard[l.assigned_cro_id] = (croLeaderboard[l.assigned_cro_id] || 0) + 1
    })

    // Monthly trend (last 6 months)
    const monthlyLeads: Record<string, number> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
      monthlyLeads[key] = 0
    }
    allLeads.forEach(l => {
      const d = new Date(l.lead_entry_date)
      const key = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
      if (monthlyLeads[key] !== undefined) monthlyLeads[key]++
    })

    return {
      total, inbound, outbound, seatLockPaid, lost, convRate,
      revPemetaan, revSeatLock, revTotal: revPemetaan + revSeatLock,
      bySource, byStage, lostReasons, croLeaderboard, monthlyLeads,
    }
  }, [allLeads, payments])

  const topSources = Object.entries(stats.bySource).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const pipelineStages = PIPELINE_STAGES.map(s => ({ stage: s, count: stats.byStage[s] || 0 })).filter(s => s.count > 0)
  const maxStageCount = Math.max(...pipelineStages.map(s => s.count), 1)
  const topReasons = Object.entries(stats.lostReasons).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const maxReasonCount = Math.max(...topReasons.map(r => r[1]), 1)
  const maxSource = Math.max(...topSources.map(s => s[1]), 1)
  const maxMonthly = Math.max(...Object.values(stats.monthlyLeads), 1)

  const croRanking = Object.entries(stats.croLeaderboard)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      name: users.find(u => u.id === id)?.name || 'Unknown',
      count,
    }))

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Leads', value: stats.total, color: '#a78bfa', icon: Users },
          { label: 'Seat Lock Paid', value: stats.seatLockPaid, color: '#22c55e', icon: Award },
          { label: 'Konversi Rate', value: `${stats.convRate}%`, color: '#10b981', icon: Target },
          { label: 'Rev Pemetaan', value: `Rp ${(stats.revPemetaan / 1e6).toFixed(1)}jt`, color: '#8b5cf6', icon: DollarSign },
          { label: 'Rev Seat Lock', value: `Rp ${(stats.revSeatLock / 1e6).toFixed(1)}jt`, color: '#f59e0b', icon: DollarSign },
          { label: 'Total Revenue', value: `Rp ${(stats.revTotal / 1e6).toFixed(1)}jt`, color: '#60a5fa', icon: TrendingUp },
        ].map(kpi => (
          <div key={kpi.label} className="glass-card rounded-2xl p-4 border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/35 font-bold uppercase tracking-wide">{kpi.label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                <kpi.icon size={14} style={{ color: kpi.color }} />
              </div>
            </div>
            <p className="text-xl font-extrabold text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-purple-400" />
            Tren Lead Masuk (6 Bulan)
          </h3>
          <div className="flex items-end gap-2 h-32">
            {Object.entries(stats.monthlyLeads).map(([month, count]) => {
              const pct = (count / maxMonthly) * 100
              return (
                <div key={month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[8px] text-white/40 font-bold">{count}</span>
                  <div className="w-full rounded-t-lg transition-all duration-500" style={{ height: `${Math.max(pct, 4)}%`, background: 'linear-gradient(to top, hsl(250,84%,60%), hsl(280,60%,55%))' }} />
                  <span className="text-[8px] text-white/30">{month}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top Sources */}
        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-400" />
            Top Source Campaign
          </h3>
          <div className="space-y-2.5">
            {topSources.slice(0, 5).map(([source, count]) => (
              <div key={source} className="flex items-center gap-3">
                <span className="text-[10px] text-white/60 truncate w-28 flex-shrink-0">{source || 'Unknown'}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'hsl(222,47%,14%)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(count / maxSource) * 100}%`, background: 'linear-gradient(90deg, hsl(210,100%,56%), hsl(250,84%,65%))' }}
                  />
                </div>
                <span className="text-[10px] font-extrabold text-white w-8 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Funnel */}
        <div className="glass-card rounded-2xl p-5 border border-white/5">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Target size={14} className="text-emerald-400" />
            Distribusi Pipeline Stage
          </h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {pipelineStages.map(({ stage, count }) => {
              const color = STAGE_COLORS[stage] || '#64748b'
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                  <span className="text-[10px] text-white/55 flex-1 truncate">{stage}</span>
                  <div className="w-24 h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'hsl(222,47%,14%)' }}>
                    <div className="h-full rounded-full" style={{ width: `${(count / maxStageCount) * 100}%`, background: color }} />
                  </div>
                  <span className="text-[10px] font-extrabold text-white w-6 text-right flex-shrink-0">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* CRO Leaderboard */}
        <div className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Award size={14} className="text-amber-400" />
            🏆 CRO Leaderboard (Seat Lock)
          </h3>
          {croRanking.length === 0 ? (
            <p className="text-white/30 text-xs text-center py-8">Belum ada data seat lock.</p>
          ) : (
            <div className="space-y-3">
              {croRanking.map((cro, idx) => (
                <div key={cro.name} className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-extrabold flex-shrink-0"
                    style={{
                      background: idx === 0 ? 'rgba(251,191,36,0.2)' : idx === 1 ? 'rgba(148,163,184,0.15)' : idx === 2 ? 'rgba(180,83,9,0.15)' : 'rgba(255,255,255,0.05)',
                      color: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#ffffff80',
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-xs font-semibold text-white truncate">{cro.name}</span>
                  <span className="text-xs font-extrabold text-emerald-400">{cro.count} SL</span>
                </div>
              ))}
            </div>
          )}

          {/* Lost reasons */}
          {topReasons.length > 0 && (
            <div className="border-t border-white/5 pt-4 space-y-2">
              <h4 className="text-[9px] font-extrabold text-white/30 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle size={10} /> Top Lost Reasons
              </h4>
              {topReasons.map(([reason, count]) => (
                <div key={reason} className="flex items-center gap-2">
                  <span className="text-[9px] text-white/50 flex-1 truncate">{reason}</span>
                  <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(222,47%,14%)' }}>
                    <div className="h-full rounded-full bg-red-500/60" style={{ width: `${(count / maxReasonCount) * 100}%` }} />
                  </div>
                  <span className="text-[9px] font-bold text-red-400 w-4 text-right">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lead Type Split */}
      <div className="glass-card rounded-2xl p-5 border border-white/5">
        <h3 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4">Lead Type Distribution</h3>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
              <Users size={16} className="text-blue-400" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-white">{stats.inbound}</p>
              <p className="text-[10px] text-white/40">Inbound</p>
            </div>
          </div>
          <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: 'hsl(222,47%,12%)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: stats.total > 0 ? `${(stats.inbound / stats.total) * 100}%` : '50%',
                background: 'linear-gradient(90deg, hsl(210,100%,56%), hsl(250,84%,65%))'
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-lg font-extrabold text-white text-right">{stats.outbound}</p>
              <p className="text-[10px] text-white/40 text-right">Outbound</p>
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
              <TrendingUp size={16} className="text-amber-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

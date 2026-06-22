'use client'

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid
} from 'recharts'

const SOURCE_LABELS: Record<string, string> = {
  ig: 'Instagram', fb: 'Facebook', linkedin: 'LinkedIn',
  webinar: 'Webinar', manual: 'Manual', referral: 'Referral', other: 'Lainnya'
}

const SOURCE_COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#64748b']

const STAGE_LABELS: Record<string, string> = {
  new: 'Baru', probing: 'Probing', hot: 'Hot', potential: 'Potensial',
  converted: 'Konversi', rejected: 'Reject'
}

const STAGE_COLORS: Record<string, string> = {
  new: '#64748b', probing: '#3b82f6', hot: '#f97316',
  potential: '#eab308', converted: '#22c55e', rejected: '#ef4444'
}

const FUNNEL_ORDER = ['new', 'probing', 'hot', 'potential', 'converted']

interface AnalyticsDashboardProps {
  bySource: Record<string, number>
  byStage: Record<string, number>
  totalLeads: number
  totalConverted: number
  topRejReasons: [string, number][]
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="px-3 py-2 rounded-xl text-xs" style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}>
      <p className="font-medium text-white mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export function AnalyticsDashboard({ bySource, byStage, totalLeads, totalConverted, topRejReasons }: AnalyticsDashboardProps) {
  const convRate = totalLeads > 0 ? ((totalConverted / totalLeads) * 100).toFixed(1) : '0'

  const sourceData = Object.entries(bySource)
    .map(([key, value]) => ({ name: SOURCE_LABELS[key] || key, value }))
    .sort((a, b) => b.value - a.value)

  const stageData = FUNNEL_ORDER.map(stage => ({
    name: STAGE_LABELS[stage] || stage,
    leads: byStage[stage] || 0,
    fill: STAGE_COLORS[stage],
  }))

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: totalLeads.toLocaleString('id-ID'), color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
          { label: 'Konversi', value: totalConverted.toLocaleString('id-ID'), color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
          { label: 'Conv. Rate', value: `${convRate}%`, color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
          { label: 'Hot Leads', value: (byStage['hot'] || 0).toLocaleString('id-ID'), color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map(kpi => (
          <div key={kpi.label} className="glass-card rounded-2xl p-5" style={{ border: `1px solid ${kpi.color}20` }}>
            <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            <p className="text-xs text-white/40 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Source Distribution */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Leads by Source</h2>
          {sourceData.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-10">Belum ada data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {sourceData.map((_, index) => (
                    <Cell key={index} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Funnel */}
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Pipeline Funnel</h2>
          {stageData.every(d => d.leads === 0) ? (
            <p className="text-xs text-white/30 text-center py-10">Belum ada data</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stageData} layout="vertical">
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 11 }} width={65} axisLine={false} tickLine={false} />
                <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="leads" name="Leads" radius={[0, 6, 6, 0]}>
                  {stageData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Rejection Reasons */}
      {topRejReasons.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Alasan Reject Terbanyak</h2>
          <div className="space-y-3">
            {topRejReasons.map(([reason, count], i) => {
              const total = topRejReasons.reduce((s, [, c]) => s + c, 0)
              const pct = Math.round((count / total) * 100)
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/70 truncate max-w-[70%]">{reason}</span>
                    <span className="text-red-400 font-medium">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'hsl(222,47%,14%)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: 'hsl(0,72%,51%)' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Activity,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Download,
  Search,
  TrendingUp,
  UserRoundCheck,
  Users,
} from 'lucide-react'

type ActivityRow = {
  id: string
  lead_id: string
  activity_type: string
  description: string
  created_by: string | null
  created_at: string
  users?: { id?: string; name?: string } | null
  leads?: {
    id: string
    full_name: string
    whatsapp_number: string
    source_campaign: string
    current_status: string
  } | null
}

type UserRow = {
  id: string
  name: string
}

type InterventionRow = {
  id: string
  lead_id: string
  created_by: string | null
  lead_condition: string | null
  objection_category: string | null
  solution_given: string | null
  expert_needed: boolean
  expert_type: string | null
  commercial_type: string | null
  service_opportunity: string | null
  next_action: string | null
  next_follow_up_date: string | null
  result: string | null
  notes: string | null
  created_at: string
  users?: { id?: string; name?: string } | null
  leads?: {
    id: string
    full_name: string
    whatsapp_number: string
    source_campaign: string
    current_status: string
  } | null
}

interface TeamReportDashboardProps {
  activities: ActivityRow[]
  interventions: InterventionRow[]
  users: UserRow[]
  selectedDate: string
  selectedUser: string
}

const ACTIVITY_COLORS: Record<string, string> = {
  'Lead created': 'hsl(250,84%,64%)',
  'Lead Updated': 'hsl(210,100%,56%)',
  'Status changed': 'hsl(160,84%,39%)',
  'Payment Added': 'hsl(38,92%,50%)',
  'Pemetaan Updated': 'hsl(280,70%,58%)',
  'Pemetaan Created': 'hsl(280,70%,58%)',
  'Expert Consultation Updated': 'hsl(199,89%,48%)',
  'Expert Consultation Created': 'hsl(199,89%,48%)',
}

export function TeamReportDashboard({
  activities,
  interventions,
  users,
  selectedDate,
  selectedUser,
}: TeamReportDashboardProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const report = useMemo(() => {
    const byUser: Record<string, { name: string; activities: number; leads: Set<string>; payments: number; statuses: number; interventions: number }> = {}
    const byType: Record<string, number> = {}
    const byCampaign: Record<string, { activities: number; leads: Set<string> }> = {}

    activities.forEach(activity => {
      const userId = activity.created_by || 'unassigned'
      const userName = activity.users?.name || 'Unknown / sistem lama'
      const campaign = activity.leads?.source_campaign || 'Tanpa campaign'

      if (!byUser[userId]) {
        byUser[userId] = { name: userName, activities: 0, leads: new Set(), payments: 0, statuses: 0, interventions: 0 }
      }
      byUser[userId].activities += 1
      if (activity.lead_id) byUser[userId].leads.add(activity.lead_id)
      if (activity.activity_type.toLowerCase().includes('payment')) byUser[userId].payments += 1
      if (activity.activity_type.toLowerCase().includes('status')) byUser[userId].statuses += 1

      byType[activity.activity_type] = (byType[activity.activity_type] || 0) + 1

      if (!byCampaign[campaign]) {
        byCampaign[campaign] = { activities: 0, leads: new Set() }
      }
      byCampaign[campaign].activities += 1
      if (activity.lead_id) byCampaign[campaign].leads.add(activity.lead_id)
    })

    interventions.forEach(item => {
      const userId = item.created_by || 'unassigned'
      const userName = item.users?.name || 'Unknown / sistem lama'
      const campaign = item.leads?.source_campaign || 'Tanpa campaign'

      if (!byUser[userId]) {
        byUser[userId] = { name: userName, activities: 0, leads: new Set(), payments: 0, statuses: 0, interventions: 0 }
      }
      byUser[userId].activities += 1
      byUser[userId].interventions += 1
      if (item.lead_id) byUser[userId].leads.add(item.lead_id)

      byType['Intervention Logged'] = (byType['Intervention Logged'] || 0) + 1

      if (!byCampaign[campaign]) {
        byCampaign[campaign] = { activities: 0, leads: new Set() }
      }
      byCampaign[campaign].activities += 1
      if (item.lead_id) byCampaign[campaign].leads.add(item.lead_id)
    })

    const uniqueLeads = new Set([
      ...activities.map(activity => activity.lead_id).filter(Boolean),
      ...interventions.map(item => item.lead_id).filter(Boolean),
    ])
    const teamRows = Object.entries(byUser)
      .map(([id, data]) => ({
        id,
        name: data.name,
        activities: data.activities,
        touchedLeads: data.leads.size,
        payments: data.payments,
        statuses: data.statuses,
        interventions: data.interventions,
      }))
      .sort((a, b) => b.activities - a.activities)

    const typeRows = Object.entries(byType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)

    const campaignRows = Object.entries(byCampaign)
      .map(([campaign, data]) => ({
        campaign,
        activities: data.activities,
        touchedLeads: data.leads.size,
      }))
      .sort((a, b) => b.activities - a.activities)
      .slice(0, 8)

    return {
      totalActivities: activities.length + interventions.length,
      touchedLeads: uniqueLeads.size,
      activeUsers: teamRows.filter(row => row.id !== 'unassigned').length,
      statusChanges: activities.filter(activity => activity.activity_type.toLowerCase().includes('status')).length,
      teamRows,
      typeRows,
      campaignRows,
    }
  }, [activities, interventions])

  const filteredActivities = activities.filter(activity => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return true

    return [
      activity.activity_type,
      activity.description,
      activity.users?.name,
      activity.leads?.full_name,
      activity.leads?.whatsapp_number,
      activity.leads?.source_campaign,
      activity.leads?.current_status,
    ]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(keyword))
  })

  const filteredInterventions = interventions.filter(item => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return true

    return [
      item.lead_condition,
      item.objection_category,
      item.solution_given,
      item.commercial_type,
      item.service_opportunity,
      item.next_action,
      item.result,
      item.notes,
      item.users?.name,
      item.leads?.full_name,
      item.leads?.whatsapp_number,
      item.leads?.source_campaign,
      item.leads?.current_status,
    ]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(keyword))
  })

  const updateFilter = (next: { date?: string; user?: string }) => {
    const params = new URLSearchParams()
    params.set('date', next.date ?? selectedDate)
    const user = next.user ?? selectedUser
    if (user) params.set('user', user)
    router.push(`/reports?${params.toString()}`)
  }

  const exportCsv = () => {
    const activityRows = filteredActivities.map(activity => ({
      tanggal: new Date(activity.created_at).toLocaleString('id-ID'),
      user: activity.users?.name || 'Unknown / sistem lama',
      activity_type: activity.activity_type,
      lead: activity.leads?.full_name || '',
      whatsapp: activity.leads?.whatsapp_number || '',
      campaign: activity.leads?.source_campaign || '',
      status: activity.leads?.current_status || '',
      description: activity.description,
      lead_condition: '',
      objection: '',
      solution: '',
      commercial_type: '',
      next_action: '',
      result: '',
    }))

    const interventionRows = filteredInterventions.map(item => ({
      tanggal: new Date(item.created_at).toLocaleString('id-ID'),
      user: item.users?.name || 'Unknown / sistem lama',
      activity_type: 'Intervention Logged',
      lead: item.leads?.full_name || '',
      whatsapp: item.leads?.whatsapp_number || '',
      campaign: item.leads?.source_campaign || '',
      status: item.leads?.current_status || '',
      description: item.notes || '',
      lead_condition: item.lead_condition || '',
      objection: item.objection_category || '',
      solution: item.solution_given || '',
      commercial_type: item.commercial_type || '',
      next_action: item.next_action || '',
      result: item.result || '',
    }))

    const rows = [...interventionRows, ...activityRows]
    const headers = ['tanggal', 'user', 'activity_type', 'lead', 'whatsapp', 'campaign', 'status', 'lead_condition', 'objection', 'solution', 'commercial_type', 'next_action', 'result', 'description']
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(header => escapeCsv(row[header as keyof typeof row])).join(',')),
    ].join('\n')

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `team-report-${selectedDate}${selectedUser ? '-filtered' : ''}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const maxType = Math.max(...report.typeRows.map(row => row.count), 1)

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-muted-foreground">
            <CalendarDays size={16} />
            <input
              type="date"
              value={selectedDate}
              onChange={event => updateFilter({ date: event.target.value })}
              className="bg-transparent text-foreground outline-none"
            />
          </label>

          <select
            value={selectedUser}
            onChange={event => updateFilter({ user: event.target.value })}
            className="px-3 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none"
          >
            <option value="">Semua tim</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <div className="relative w-full xl:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Cari aktivitas, nama lead, campaign..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredActivities.length === 0 && filteredInterventions.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/5"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Aktivitas', value: report.totalActivities, icon: Activity, tone: 'hsl(250,84%,64%)' },
          { label: 'Lead Disentuh', value: report.touchedLeads, icon: Users, tone: 'hsl(160,84%,39%)' },
          { label: 'User Aktif', value: report.activeUsers, icon: UserRoundCheck, tone: 'hsl(210,100%,56%)' },
          { label: 'Status Berubah', value: report.statusChanges, icon: TrendingUp, tone: 'hsl(38,92%,50%)' },
        ].map(card => (
          <div key={card.label} className="rounded-2xl border border-border bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">{card.label}</span>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${card.tone}20` }}>
                <card.icon size={16} style={{ color: card.tone }} />
              </div>
            </div>
            <p className="mt-5 text-3xl font-black text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Aktivitas Per Tim</h2>
              <p className="text-xs text-muted-foreground mt-1">Ringkasan otomatis dari log kerja harian.</p>
            </div>
            <span className="text-xs text-muted-foreground">{report.teamRows.length} user</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4">Team</th>
                  <th className="py-3 px-4 text-right">Aktivitas</th>
                  <th className="py-3 px-4 text-right">Lead</th>
                  <th className="py-3 px-4 text-right">Status</th>
                  <th className="py-3 pl-4 text-right">Payment</th>
                  <th className="py-3 pl-4 text-right">Handling</th>
                </tr>
              </thead>
              <tbody>
                {report.teamRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">Belum ada aktivitas di tanggal ini.</td>
                  </tr>
                ) : report.teamRows.map(row => (
                  <tr key={row.id} className="border-b border-border/70 last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-foreground">{row.name}</div>
                      <div className="text-[10px] text-muted-foreground">{row.id === 'unassigned' ? 'Log lama tanpa user' : 'Aktif hari ini'}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-primary">{row.activities}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{row.touchedLeads}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{row.statuses}</td>
                    <td className="py-3 pl-4 text-right text-muted-foreground">{row.payments}</td>
                    <td className="py-3 pl-4 text-right font-extrabold text-orange-500">{row.interventions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground mb-4">Tipe Aktivitas</h2>
          <div className="space-y-3">
            {report.typeRows.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Belum ada tipe aktivitas.</p>
            ) : report.typeRows.map(row => {
              const color = ACTIVITY_COLORS[row.type] || 'hsl(215,16%,47%)'
              return (
                <div key={row.type} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-foreground truncate">{row.type}</span>
                    <span className="text-xs font-extrabold text-muted-foreground">{row.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(row.count / maxType) * 100}%`, background: color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">EOD Handling Detail</h2>
            <p className="text-xs text-muted-foreground mt-1">Format: lead, kondisi, objection, solusi, free/paid, next action.</p>
          </div>
          <span className="text-xs text-muted-foreground">{filteredInterventions.length} handling</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4">CRO & Lead</th>
                <th className="py-3 px-4">Kondisi</th>
                <th className="py-3 px-4">Objection</th>
                <th className="py-3 px-4">Solusi</th>
                <th className="py-3 px-4">Free/Paid</th>
                <th className="py-3 px-4">Next Action</th>
                <th className="py-3 pl-4">Result</th>
              </tr>
            </thead>
            <tbody>
              {filteredInterventions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">Belum ada handling log di tanggal ini.</td>
                </tr>
              ) : filteredInterventions.map(item => (
                <tr key={item.id} className="border-b border-border/70 last:border-b-0 align-top">
                  <td className="py-3 pr-4">
                    <p className="font-bold text-foreground">{item.users?.name || 'Unknown / sistem lama'}</p>
                    {item.leads ? (
                      <Link href={`/leads/${item.leads.id}`} className="mt-1 block text-xs font-semibold text-primary hover:underline">
                        {item.leads.full_name}
                      </Link>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">Lead tidak ditemukan</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">{item.lead_condition || '-'}</td>
                  <td className="py-3 px-4 font-semibold text-foreground">{item.objection_category || '-'}</td>
                  <td className="py-3 px-4 text-muted-foreground">{item.solution_given || '-'}</td>
                  <td className="py-3 px-4">
                    <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-bold text-foreground">
                      {item.commercial_type || 'Free'}
                    </span>
                    {item.service_opportunity && (
                      <p className="mt-1 text-[10px] text-muted-foreground">{item.service_opportunity}</p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {item.next_action || '-'}
                    {item.next_follow_up_date && (
                      <p className="mt-1 text-[10px]">FU: {new Date(item.next_follow_up_date).toLocaleDateString('id-ID')}</p>
                    )}
                    {item.expert_needed && (
                      <p className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-300">Expert: {item.expert_type || 'Ya'}</p>
                    )}
                  </td>
                  <td className="py-3 pl-4 text-muted-foreground">{item.result || item.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground mb-4">Campaign Tersentuh</h2>
          <div className="space-y-3">
            {report.campaignRows.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Belum ada campaign aktif.</p>
            ) : report.campaignRows.map(row => (
              <div key={row.campaign} className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">{row.campaign}</p>
                  <p className="text-[10px] text-muted-foreground">{row.touchedLeads} lead disentuh</p>
                </div>
                <span className="text-xs font-black text-primary">{row.activities}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Detail Aktivitas</h2>
              <p className="text-xs text-muted-foreground mt-1">Audit trail per aksi yang dilakukan tim.</p>
            </div>
            <span className="text-xs text-muted-foreground">{filteredActivities.length} log</span>
          </div>

          <div className="divide-y divide-border/70">
            {filteredActivities.length === 0 ? (
              <div className="py-10 text-center">
                <ClipboardList className="mx-auto text-muted-foreground/50" size={28} />
                <p className="mt-2 text-xs text-muted-foreground">Tidak ada aktivitas yang cocok.</p>
              </div>
            ) : filteredActivities.map(activity => (
              <div key={activity.id} className="py-3 flex items-start gap-3">
                <div className="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: ACTIVITY_COLORS[activity.activity_type] || 'hsl(215,16%,47%)' }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-extrabold text-foreground">{activity.activity_type}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(activity.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-muted-foreground">oleh {activity.users?.name || 'Unknown / sistem lama'}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{activity.description}</p>
                  {activity.leads && (
                    <Link
                      href={`/leads/${activity.leads.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                    >
                      {activity.leads.full_name}
                      <span className="text-muted-foreground font-medium">/ {activity.leads.source_campaign}</span>
                      <ChevronRight size={12} />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

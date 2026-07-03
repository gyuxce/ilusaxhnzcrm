'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Activity,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Copy,
  CheckCircle2,
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

type CroEodRow = {
  name: string
  total: number
  touchedLeads: number
  expertNeeded: number
  potentialPaid: number
  topObjection: string
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

const ACTIVITY_LABELS: Record<string, string> = {
  'Lead created': 'Lead dibuat',
  'Lead Updated': 'Data lead diubah',
  'Status changed': 'Status diubah',
  'Payment Added': 'Pembayaran dicatat',
  'Pemetaan Updated': 'Pemetaan diubah',
  'Pemetaan Created': 'Pemetaan dibuat',
  'Expert Consultation Updated': 'Konsultasi diubah',
  'Expert Consultation Created': 'Konsultasi dibuat',
  'Intervention Logged': 'Catatan chat',
  'Follow-Up Scheduled': 'Follow-up dijadwalkan',
  'Follow-Up Completed': 'Follow-up selesai',
}

function activityLabel(type: string) {
  return ACTIVITY_LABELS[type] || type
}

function commercialLabel(value?: string | null) {
  if (value === 'Potential Paid') return 'Bisa Berbayar'
  if (value === 'Paid') return 'Berbayar'
  if (value === 'Free') return 'Gratis'
  return value || 'Gratis'
}

function isOperationalActivity(activity: ActivityRow) {
  return activity.activity_type !== 'Lead created'
}

export function TeamReportDashboard({
  activities,
  interventions,
  users,
  selectedDate,
  selectedUser,
}: TeamReportDashboardProps) {
  const router = useRouter()
  const [clientActivities, setClientActivities] = useState<ActivityRow[]>(activities)
  const [clientInterventions, setClientInterventions] = useState<InterventionRow[]>(interventions)
  const [loadingReport, setLoadingReport] = useState(false)
  const [query, setQuery] = useState('')
  const [copied, setCopied] = useState(false)

  const dateRange = useMemo(() => {
    const start = new Date(`${selectedDate}T00:00:00+07:00`)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    }
  }, [selectedDate])

  useEffect(() => {
    setClientActivities(activities)
    setClientInterventions(interventions)
  }, [activities, interventions])

  useEffect(() => {
    let active = true

    async function fetchClientReport() {
      setLoadingReport(true)
      const supabase = createClient()

      let activitiesQuery = supabase
        .from('lead_activities')
        .select(`
          id,
          lead_id,
          activity_type,
          description,
          created_by,
          created_at,
          users:created_by(id, name),
          leads:lead_id(id, full_name, whatsapp_number, source_campaign, current_status)
        `)
        .gte('created_at', dateRange.start)
        .lt('created_at', dateRange.end)
        .order('created_at', { ascending: false })

      let interventionsQuery = supabase
        .from('lead_interventions')
        .select(`
          id,
          lead_id,
          created_by,
          lead_condition,
          objection_category,
          solution_given,
          expert_needed,
          expert_type,
          commercial_type,
          service_opportunity,
          next_action,
          next_follow_up_date,
          result,
          notes,
          created_at,
          users:created_by(id, name),
          leads:lead_id(id, full_name, whatsapp_number, source_campaign, current_status)
        `)
        .gte('created_at', dateRange.start)
        .lt('created_at', dateRange.end)
        .order('created_at', { ascending: false })

      if (selectedUser) {
        activitiesQuery = activitiesQuery.eq('created_by', selectedUser)
        interventionsQuery = interventionsQuery.eq('created_by', selectedUser)
      }

      const [activitiesRes, interventionsRes] = await Promise.all([
        activitiesQuery,
        interventionsQuery,
      ])

      if (!active) return
      if (!activitiesRes.error) setClientActivities((activitiesRes.data || []) as any[])
      if (!interventionsRes.error) setClientInterventions((interventionsRes.data || []) as any[])
      setLoadingReport(false)
    }

    fetchClientReport()

    return () => {
      active = false
    }
  }, [dateRange.start, dateRange.end, selectedUser])

  const report = useMemo(() => {
    const byUser: Record<string, { name: string; activities: number; leads: Set<string>; payments: number; statuses: number; interventions: number }> = {}
    const byType: Record<string, number> = {}
    const byCampaign: Record<string, { activities: number; leads: Set<string> }> = {}
    const operationalActivities = clientActivities.filter(isOperationalActivity)

    operationalActivities.forEach(activity => {
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

    clientInterventions.forEach(item => {
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
      ...operationalActivities.map(activity => activity.lead_id).filter(Boolean),
      ...clientInterventions.map(item => item.lead_id).filter(Boolean),
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
      totalActivities: operationalActivities.length + clientInterventions.length,
      touchedLeads: uniqueLeads.size,
      activeUsers: teamRows.filter(row => row.id !== 'unassigned').length,
      statusChanges: operationalActivities.filter(activity => activity.activity_type.toLowerCase().includes('status')).length,
      teamRows,
      typeRows,
      campaignRows,
    }
  }, [clientActivities, clientInterventions])

  const filteredActivities = clientActivities.filter(activity => {
    if (!isOperationalActivity(activity)) return false
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

  const filteredInterventions = clientInterventions.filter(item => {
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

  const formatDisplayDate = (value: string) => new Date(`${value}T00:00:00+07:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const formatShortDate = (value: string | null) => {
    if (!value) return '-'
    return new Date(`${value}T00:00:00+07:00`).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
    })
  }

  const eodInsights = useMemo(() => {
    const touchedLeads = new Set(filteredInterventions.map(item => item.lead_id).filter(Boolean)).size
    const objectionCounts = filteredInterventions.reduce<Record<string, number>>((counts, item) => {
      const objection = item.objection_category || 'Belum dikategorikan'
      counts[objection] = (counts[objection] || 0) + 1
      return counts
    }, {})

    const topObjections = Object.entries(objectionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    const isPotentialPaid = (item: InterventionRow) =>
      (item.commercial_type || '').toLowerCase().includes('paid')

    const priorityItems = [...filteredInterventions]
      .map(item => ({
        item,
        score:
          (item.expert_needed || item.expert_type ? 4 : 0) +
          (isPotentialPaid(item) ? 3 : 0) +
          (item.next_follow_up_date ? 2 : 0) +
          (!item.result ? 1 : 0),
      }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item)

    const byCro = filteredInterventions.reduce<Record<string, number>>((counts, item) => {
      const cro = item.users?.name || 'Unknown / sistem lama'
      counts[cro] = (counts[cro] || 0) + 1
      return counts
    }, {})

    const byCroStats = Object.entries(
      filteredInterventions.reduce<Record<string, {
        name: string
        total: number
        leads: Set<string>
        expertNeeded: number
        potentialPaid: number
        objections: Record<string, number>
      }>>((acc, item) => {
        const key = item.created_by || 'unassigned'
        const name = item.users?.name || 'Unknown / sistem lama'
        if (!acc[key]) {
          acc[key] = {
            name,
            total: 0,
            leads: new Set(),
            expertNeeded: 0,
            potentialPaid: 0,
            objections: {},
          }
        }
        acc[key].total += 1
        if (item.lead_id) acc[key].leads.add(item.lead_id)
        if (item.expert_needed || item.expert_type) acc[key].expertNeeded += 1
        if (isPotentialPaid(item)) acc[key].potentialPaid += 1
        const objection = item.objection_category || 'Belum dikategorikan'
        acc[key].objections[objection] = (acc[key].objections[objection] || 0) + 1
        return acc
      }, {})
    ).map(([, row]) => {
      const top = Object.entries(row.objections).sort((a, b) => b[1] - a[1])[0]
      return {
        name: row.name,
        total: row.total,
        touchedLeads: row.leads.size,
        expertNeeded: row.expertNeeded,
        potentialPaid: row.potentialPaid,
        topObjection: top ? `${top[0]} (${top[1]})` : '-',
      } satisfies CroEodRow
    }).sort((a, b) => b.total - a.total)

    return {
      totalHandling: filteredInterventions.length,
      touchedLeads,
      expertNeeded: filteredInterventions.filter(item => item.expert_needed || item.expert_type).length,
      potentialPaid: filteredInterventions.filter(isPotentialPaid).length,
      scheduledFollowUps: filteredInterventions.filter(item => item.next_follow_up_date).length,
      topObjections,
      priorityItems,
      byCro: Object.entries(byCro).sort((a, b) => b[1] - a[1]),
      byCroStats,
    }
  }, [filteredInterventions])

  const eodSummaryText = useMemo(() => {
    if (filteredInterventions.length === 0) {
      return 'Belum ada catatan chat di tanggal ini.'
    }

    const selectedUserLabel = selectedUser
      ? users.find(user => user.id === selectedUser)?.name || 'Tim terpilih'
      : 'Semua Tim'
    const dateLabel = formatDisplayDate(selectedDate)
    const objectionSummary = eodInsights.topObjections.length
      ? eodInsights.topObjections.map(([name, count]) => `${name} (${count})`).join(', ')
      : '-'
    const croSummary = eodInsights.byCroStats.length
      ? eodInsights.byCroStats.map(row => `- ${row.name}: ${row.total} catatan, ${row.touchedLeads} lead, kendala terbanyak ${row.topObjection}`).join('\n')
      : '-'
    const priorityItems = eodInsights.priorityItems.slice(0, 10)
    const priorityText = priorityItems.length === 0
      ? 'Tidak ada kasus prioritas.'
      : priorityItems
      .map((item, index) => {
        const lead = item.leads?.full_name || 'Lead tidak ditemukan'
        const objection = item.objection_category || '-'
        const expert = item.expert_needed || item.expert_type ? item.expert_type || 'Ya' : '-'
        const nextFu = item.next_follow_up_date ? ` ${formatShortDate(item.next_follow_up_date)}` : ''
        const nextAction = item.next_action ? `${item.next_action}${nextFu}` : '-'

        return [
          `${index + 1}. ${lead}`,
          `   Kendala: ${objection}`,
          `   Next: ${nextAction}`,
          `   Bantuan: ${expert}`,
        ].join('\n')
      })
      .join('\n\n')

    return [
      `EOD ${selectedUserLabel} - ${dateLabel}`,
      '',
      'Ringkasan:',
      `- Total catatan chat: ${eodInsights.totalHandling}`,
      `- Lead disentuh: ${eodInsights.touchedLeads}`,
      `- Total aktivitas CRM: ${report.totalActivities}`,
      `- Kendala terbanyak: ${objectionSummary}`,
      `- Perlu dibantu: ${eodInsights.expertNeeded}`,
      `- Potensi berbayar: ${eodInsights.potentialPaid}`,
      `- Follow-up dijadwalkan: ${eodInsights.scheduledFollowUps}`,
      '',
      'Ringkasan per CRO:',
      croSummary,
      '',
      'Detail prioritas:',
      priorityText,
      eodInsights.totalHandling > priorityItems.length ? `\nDetail lengkap: export CSV (${eodInsights.totalHandling} catatan).` : '',
    ].join('\n')
  }, [filteredInterventions, eodInsights, selectedDate, selectedUser, users, report.totalActivities])

  const copyEodSummary = async () => {
    await navigator.clipboard.writeText(eodSummaryText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
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
      next_follow_up_date: '',
      expert_type: '',
      service_opportunity: '',
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
      next_follow_up_date: item.next_follow_up_date || '',
      expert_type: item.expert_type || '',
      service_opportunity: item.service_opportunity || '',
      result: item.result || '',
    }))

    const rows = [...interventionRows, ...activityRows]
    const headers = ['tanggal', 'user', 'activity_type', 'lead', 'whatsapp', 'campaign', 'status', 'lead_condition', 'objection', 'solution', 'commercial_type', 'expert_type', 'service_opportunity', 'next_action', 'next_follow_up_date', 'result', 'description']
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
          {loadingReport && (
            <div className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-bold text-muted-foreground">
              Sinkron report...
            </div>
          )}
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
          { label: 'Total Catatan', value: report.totalActivities, icon: Activity, tone: 'hsl(250,84%,64%)' },
          { label: 'Lead Dikerjakan', value: report.touchedLeads, icon: Users, tone: 'hsl(160,84%,39%)' },
          { label: 'Tim Aktif', value: report.activeUsers, icon: UserRoundCheck, tone: 'hsl(210,100%,56%)' },
          { label: 'Status Diubah', value: report.statusChanges, icon: TrendingUp, tone: 'hsl(38,92%,50%)' },
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
                  <th className="py-3 pr-4">Tim</th>
                  <th className="py-3 px-4 text-right">Aktivitas</th>
                  <th className="py-3 px-4 text-right">Lead</th>
                  <th className="py-3 px-4 text-right">Status</th>
                  <th className="py-3 pl-4 text-right">Payment</th>
                  <th className="py-3 pl-4 text-right">Catatan Chat</th>
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
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground mb-4">Jenis Aktivitas</h2>
          <div className="space-y-3">
            {report.typeRows.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Belum ada tipe aktivitas.</p>
            ) : report.typeRows.map(row => {
              const color = ACTIVITY_COLORS[row.type] || 'hsl(215,16%,47%)'
              return (
                <div key={row.type} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-foreground truncate">{activityLabel(row.type)}</span>
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
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Detail Catatan Harian</h2>
            <p className="text-xs text-muted-foreground mt-1">Format: lead, kondisi, kendala, respon CRO, gratis/berbayar, langkah berikutnya.</p>
          </div>
          <span className="text-xs text-muted-foreground">{filteredInterventions.length} catatan</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4">CRO & Lead</th>
                <th className="py-3 px-4">Kondisi</th>
                <th className="py-3 px-4">Kendala</th>
                <th className="py-3 px-4">Respon CRO</th>
                <th className="py-3 px-4">Gratis/Berbayar</th>
                <th className="py-3 px-4">Langkah</th>
                <th className="py-3 pl-4">Hasil</th>
              </tr>
            </thead>
            <tbody>
              {filteredInterventions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted-foreground">Belum ada catatan chat di tanggal ini.</td>
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
                      {commercialLabel(item.commercial_type)}
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
                      <p className="mt-1 text-[10px] font-bold text-amber-600 dark:text-amber-300">Perlu dibantu: {item.expert_type || 'Ya'}</p>
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
        <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Ringkasan Handling Per CRO</h2>
              <p className="text-xs text-muted-foreground mt-1">Dipakai untuk membaca produktivitas dan pola kendala per orang.</p>
            </div>
            <span className="text-xs text-muted-foreground">{eodInsights.byCroStats.length} CRO</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4">CRO</th>
                  <th className="py-3 px-4 text-right">Catatan</th>
                  <th className="py-3 px-4 text-right">Lead</th>
                  <th className="py-3 px-4">Kendala Terbanyak</th>
                  <th className="py-3 px-4 text-right">Dibantu</th>
                  <th className="py-3 pl-4 text-right">Berbayar</th>
                </tr>
              </thead>
              <tbody>
                {eodInsights.byCroStats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">Belum ada catatan chat untuk diringkas.</td>
                  </tr>
                ) : eodInsights.byCroStats.map(row => (
                  <tr key={row.name} className="border-b border-border/70 last:border-b-0">
                    <td className="py-3 pr-4 font-bold text-foreground">{row.name}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-primary">{row.total}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{row.touchedLeads}</td>
                    <td className="py-3 px-4 text-muted-foreground">{row.topObjection}</td>
                    <td className="py-3 px-4 text-right font-bold text-amber-600 dark:text-amber-300">{row.expertNeeded}</td>
                    <td className="py-3 pl-4 text-right font-bold text-blue-600 dark:text-blue-300">{row.potentialPaid}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Ringkasan EOD Siap Kirim</h2>
            <p className="text-xs text-muted-foreground mt-1">Ringkasan manajemen dan kasus prioritas. Detail lengkap tersedia melalui Export CSV.</p>
          </div>
          <button
            type="button"
            onClick={copyEodSummary}
            disabled={filteredInterventions.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/5"
          >
            {copied ? <CheckCircle2 size={15} /> : <Copy size={15} />}
            {copied ? 'Tersalin' : 'Salin Report'}
          </button>
        </div>
        {filteredInterventions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">
            Belum ada catatan chat di tanggal ini.
          </div>
        ) : (
          <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-slate-50/80 p-4 text-sm leading-7 text-foreground shadow-inner dark:bg-white/[0.03]">
            {eodSummaryText}
          </pre>
        )}
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

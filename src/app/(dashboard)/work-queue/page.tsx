'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/client'
import { WhatsAppButton } from '@/components/leads/WhatsAppButton'
import {
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Search,
} from 'lucide-react'
import {
  COMMERCIAL_TYPE_OPTIONS,
  EXPERT_TYPE_OPTIONS,
  LEAD_CONDITION_OPTIONS,
  NEEDS_ACTION_STATUSES,
  NEXT_ACTION_OPTIONS,
  OBJECTION_CATEGORY_OPTIONS,
  SOLUTION_OPTIONS,
} from '@/lib/funnel-framework'
import { parseRpcResult } from '@/lib/rpc'
import { cn, getTodayInWIB } from '@/lib/utils'
import { isTerminalStatus, type LostStatus } from '@/lib/lead-lifecycle'
import { LOST_REASON_OPTIONS } from '@/lib/lost-reasons'
import { getFunnelStage, getStageBadgeClasses } from '@/lib/brand'

type LeadRow = {
  id: string
  full_name: string
  whatsapp_number: string
  email: string | null
  source_campaign: string
  current_status: string
  lead_entry_date: string
  last_contacted_date: string | null
  updated_at: string | null
  assigned_cro_id: string | null
  next_action: string | null
  next_follow_up_date: string | null
  lead_segment: string | null
  funnel_notes: string | null
  users?: { id?: string; name?: string } | null
}

type FollowUpRow = {
  id: string
  lead_id: string
  scheduled_date: string
  fu_type: string
  notes: string | null
  leads?: LeadRow | null
}

type QueueItem = {
  lead: LeadRow
  reason: 'FU Hari Ini' | 'Needs Action' | 'New Lead' | 'Belum Disentuh'
  priority: number
  followUp?: FollowUpRow
}

type WorkForm = {
  lead_condition: string
  objection_category: string
  solution_given: string
  notes: string
  next_action: string
  next_follow_up_date: string
  expert_needed: boolean
  expert_type: string
  commercial_type: string
  service_opportunity: string
  result: string
}

const EMPTY_FORM: WorkForm = {
  lead_condition: 'Sudah dihubungi',
  objection_category: '',
  solution_given: '',
  notes: '',
  next_action: 'Follow Up',
  next_follow_up_date: '',
  expert_needed: false,
  expert_type: '',
  commercial_type: 'Free',
  service_opportunity: '',
  result: '',
}

const QUEUE_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'fu', label: 'FU Hari Ini' },
  { key: 'needs', label: 'Needs Action' },
  { key: 'new', label: 'New Lead' },
  { key: 'stale', label: 'Belum Disentuh' },
] as const

type QueueFilter = (typeof QUEUE_FILTERS)[number]['key']
type WorkflowOutcome = 'active' | 'close'

/** Training chrome — still one screen, not a multi-page wizard. */
const WORK_STEPS_ACTIVE = [
  { n: 1, title: 'Kondisi lead', hint: 'Posisi lead saat ini setelah dihubungi.' },
  { n: 2, title: 'Kendala', hint: 'Keberatan utama yang menghambat.' },
  { n: 3, title: 'Respon CRO', hint: 'Apa yang sudah kamu sampaikan / lakukan.' },
  { n: 4, title: 'Next action', hint: 'Langkah kerja berikutnya.' },
  { n: 5, title: 'Jadwal follow-up', hint: 'Kapan follow-up berikutnya (opsional).' },
] as const

const WORK_STEPS_CLOSE = [
  { n: 1, title: 'Kondisi lead', hint: 'Posisi lead sebelum ditutup.' },
  { n: 2, title: 'Kendala', hint: 'Keberatan yang membuat lead berhenti.' },
  { n: 3, title: 'Respon CRO', hint: 'Apa yang sudah dicoba sebelum tidak lanjut.' },
  { n: 4, title: 'Status akhir', hint: 'Not Interested atau Not Eligible.' },
  { n: 5, title: 'Alasan', hint: 'Alasan utama untuk report & evaluasi.' },
] as const

function todayInput() {
  return getTodayInWIB()
}

function dateTime(value?: string | null) {
  if (!value) return 0
  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00+07:00`).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00+07:00`)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  })
}

function daysSinceTouch(lead: Pick<LeadRow, 'last_contacted_date' | 'updated_at' | 'lead_entry_date'>) {
  const latestDate = lead.last_contacted_date || lead.updated_at || lead.lead_entry_date
  if (!latestDate) return 0
  const latest = new Date(latestDate)
  if (Number.isNaN(latest.getTime())) return 0
  const now = new Date()
  return Math.max(0, Math.floor((now.getTime() - latest.getTime()) / (1000 * 60 * 60 * 24)))
}

function isStaleLead(lead: LeadRow) {
  return !isTerminalStatus(lead.current_status) && daysSinceTouch(lead) >= 3
}

function inferNextStatus(currentStatus: string, nextAction: string) {
  if (nextAction === 'First Contact' || nextAction === 'Kirim Info Program' || nextAction === 'Kirim Legalitas / Testimoni') return 'Pitching'
  if (nextAction === 'Ajak Pemetaan') return 'Pemetaan Scheduled'
  if (nextAction === 'Tunggu Hasil Pemetaan') return 'Waiting Result'
  if (nextAction === 'Jadwalkan Expert') return 'Expert Consultation Scheduled'
  if (nextAction === 'Offer Seat Lock') return 'Seat Lock Offered'
  if (nextAction === 'Follow Up Closing') return 'Belum Berhasil Closing'
  if (nextAction === 'Nurturing') return currentStatus
  return currentStatus === 'New Lead' ? 'Pitching' : currentStatus
}

export default function WorkQueuePage() {
  const supabase = createClient()
  const searchParams = useSearchParams()
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [query, setQuery] = useState('')
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all')
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [form, setForm] = useState<WorkForm>(EMPTY_FORM)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })
  const [workflowOutcome, setWorkflowOutcome] = useState<WorkflowOutcome>('active')
  const [closeStatus, setCloseStatus] = useState<LostStatus>('Not Interested')
  const [lostReason, setLostReason] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  async function fetchData() {
    setLoading(true)
    const today = todayInput()
    const requestedLeadId = searchParams.get('lead')
    const staleCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const leadSelect = 'id, full_name, whatsapp_number, email, source_campaign, current_status, lead_entry_date, last_contacted_date, updated_at, assigned_cro_id, next_action, next_follow_up_date, lead_segment, funnel_notes, users:assigned_cro_id(id, name)'

    const [newLeadsRes, needsActionRes, staleLeadsRes, followUpsRes] = await Promise.all([
      supabase.from('leads').select(leadSelect).eq('current_status', 'New Lead').order('lead_entry_date', { ascending: false }).limit(800),
      supabase.from('leads').select(leadSelect).in('current_status', NEEDS_ACTION_STATUSES).order('updated_at', { ascending: false }).limit(800),
      supabase.from('leads').select(leadSelect).lte('updated_at', staleCutoff).order('updated_at', { ascending: true }).limit(800),
      supabase
        .from('follow_ups')
        .select('id, lead_id, scheduled_date, fu_type, notes, leads:lead_id(id, full_name, whatsapp_number, email, source_campaign, current_status, lead_entry_date, last_contacted_date, updated_at, assigned_cro_id, next_action, next_follow_up_date, lead_segment, funnel_notes, users:assigned_cro_id(id, name))')
        .eq('is_done', false)
        .lte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(800),
    ])

    if (newLeadsRes.error || needsActionRes.error || staleLeadsRes.error || followUpsRes.error) {
      setMessage({
        type: 'error',
        text: newLeadsRes.error?.message || needsActionRes.error?.message || staleLeadsRes.error?.message || followUpsRes.error?.message || 'Gagal memuat antrian kerja.',
      })
      setLeads([])
      setFollowUps([])
      setLoading(false)
      return
    }

    const leadMap = new Map<string, LeadRow>()
    ;[...(newLeadsRes.data || []), ...(needsActionRes.data || []), ...(staleLeadsRes.data || [])].forEach((lead: LeadRow) => {
      leadMap.set(lead.id, lead)
    })

    const nextLeads = Array.from(leadMap.values()).filter(
      (lead: LeadRow) =>
        !isTerminalStatus(lead.current_status) &&
        (lead.current_status === 'New Lead' || NEEDS_ACTION_STATUSES.includes(lead.current_status) || isStaleLead(lead))
    )
    const nextFollowUps = ((followUpsRes.data || []) as FollowUpRow[]).filter(
      (fu) => fu.leads && !isTerminalStatus(fu.leads.current_status)
    )

    if (requestedLeadId) {
      const alreadyLoaded =
        nextLeads.some((lead: LeadRow) => lead.id === requestedLeadId) ||
        nextFollowUps.some((fu: FollowUpRow) => fu.leads?.id === requestedLeadId)

      if (!alreadyLoaded) {
        const { data: requestedLead } = await supabase
          .from('leads')
          .select(leadSelect)
          .eq('id', requestedLeadId)
          .maybeSingle()

        if (requestedLead && !isTerminalStatus(requestedLead.current_status)) {
          nextLeads.unshift(requestedLead)
        }
      }
    }

    setLeads(nextLeads)
    setFollowUps(nextFollowUps)
    setSelectedLeadId((prev) => requestedLeadId || prev || nextFollowUps[0]?.leads?.id || nextLeads[0]?.id || null)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get('filter') === 'new') {
      setQueueFilter('new')
      setSelectedLeadId(null)
    }
    const leadId = searchParams.get('lead')
    if (leadId) {
      setQueueFilter('all')
      setSelectedLeadId(leadId)
    }
  }, [searchParams])

  const queueItems = useMemo(() => {
    const map = new Map<string, QueueItem>()

    followUps.forEach((fu) => {
      if (!fu.leads) return
      map.set(fu.leads.id, { lead: fu.leads, reason: 'FU Hari Ini', priority: 1, followUp: fu })
    })

    leads.forEach((lead) => {
      if (map.has(lead.id)) return
      const isNeedsAction = NEEDS_ACTION_STATUSES.includes(lead.current_status)
      const isStale = isStaleLead(lead)
      map.set(lead.id, {
        lead,
        reason: isNeedsAction ? 'Needs Action' : lead.current_status === 'New Lead' ? 'New Lead' : 'Belum Disentuh',
        priority: isNeedsAction ? 2 : lead.current_status === 'New Lead' ? 3 : isStale ? 4 : 5,
      })
    })

    const keyword = query.trim().toLowerCase()
    return Array.from(map.values())
      .filter(
        (item) =>
          !keyword ||
          [item.lead.full_name, item.lead.whatsapp_number, item.lead.source_campaign, item.lead.current_status, item.reason].some(
            (value) => String(value || '').toLowerCase().includes(keyword)
          )
      )
      .filter((item) => {
        if (queueFilter === 'fu') return item.reason === 'FU Hari Ini'
        if (queueFilter === 'needs') return item.reason === 'Needs Action'
        if (queueFilter === 'new') return item.reason === 'New Lead'
        if (queueFilter === 'stale') return item.reason === 'Belum Disentuh'
        return true
      })
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority
        if (a.reason === 'FU Hari Ini') return dateTime(a.followUp?.scheduled_date) - dateTime(b.followUp?.scheduled_date)
        if (a.reason === 'New Lead') return dateTime(b.lead.lead_entry_date) - dateTime(a.lead.lead_entry_date)
        if (a.reason === 'Belum Disentuh') return daysSinceTouch(b.lead) - daysSinceTouch(a.lead)
        return dateTime(a.lead.lead_entry_date) - dateTime(b.lead.lead_entry_date)
      })
  }, [followUps, leads, query, queueFilter])

  const queueCounts = useMemo(() => {
    const allItems = new Map<string, QueueItem>()
    followUps.forEach((fu) => {
      if (!fu.leads) return
      allItems.set(fu.leads.id, { lead: fu.leads, reason: 'FU Hari Ini', priority: 1, followUp: fu })
    })
    leads.forEach((lead) => {
      if (allItems.has(lead.id)) return
      const isNeedsAction = NEEDS_ACTION_STATUSES.includes(lead.current_status)
      const isStale = isStaleLead(lead)
      allItems.set(lead.id, {
        lead,
        reason: isNeedsAction ? 'Needs Action' : lead.current_status === 'New Lead' ? 'New Lead' : 'Belum Disentuh',
        priority: isNeedsAction ? 2 : lead.current_status === 'New Lead' ? 3 : isStale ? 4 : 5,
      })
    })
    const items = Array.from(allItems.values())
    return {
      all: items.length,
      fu: items.filter((item) => item.reason === 'FU Hari Ini').length,
      needs: items.filter((item) => item.reason === 'Needs Action').length,
      new: items.filter((item) => item.reason === 'New Lead').length,
      stale: items.filter((item) => item.reason === 'Belum Disentuh').length,
    }
  }, [followUps, leads])

  const selectedItem = queueItems.find((item) => item.lead.id === selectedLeadId) || (!selectedLeadId ? queueItems[0] : null)
  const selectedLead = selectedItem?.lead || null
  const isCloseFlow = workflowOutcome === 'close'
  const stage = selectedLead ? getFunnelStage(selectedLead.current_status) : null
  const nextStatus = selectedLead
    ? isCloseFlow
      ? closeStatus
      : inferNextStatus(selectedLead.current_status, form.next_action)
    : '-'

  const workSteps = isCloseFlow ? WORK_STEPS_CLOSE : WORK_STEPS_ACTIVE
  const stepDone: Record<number, boolean> = {
    1: Boolean(form.lead_condition),
    2: Boolean(form.objection_category),
    3: Boolean(form.solution_given),
    4: isCloseFlow ? Boolean(closeStatus) : Boolean(form.next_action),
    5: isCloseFlow ? Boolean(lostReason) : Boolean(form.next_follow_up_date),
  }
  const doneCount = Object.values(stepDone).filter(Boolean).length
  const focusStep =
    ([1, 2, 3, 4, 5] as const).find((n) => !stepDone[n]) ?? 5

  const updateForm = (field: keyof WorkForm, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'lead_condition' && value === 'Lost') {
        setWorkflowOutcome('close')
      }
      return next
    })
  }

  const chooseLead = (leadId: string) => {
    setSelectedLeadId(leadId)
    setMessage({ type: '', text: '' })
    setForm(EMPTY_FORM)
    setWorkflowOutcome('active')
    setCloseStatus('Not Interested')
    setLostReason('')
    setShowAdvanced(false)
  }

  const canSave = () => {
    const baseValid = Boolean(form.lead_condition && form.objection_category && form.solution_given)
    if (isCloseFlow) return baseValid && Boolean(lostReason)
    return baseValid && Boolean(form.next_action)
  }

  const saveCloseLead = async () => {
    if (!selectedLead || saving) return
    if (!form.lead_condition || !form.objection_category || !form.solution_given || !lostReason) {
      setMessage({ type: 'error', text: 'Lengkapi kondisi, kendala, solusi, dan alasan lost dulu.' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })

    const { data, error } = await supabase.rpc('save_work_queue_fast', {
      p_lead_id: selectedLead.id,
      p_current_status: selectedLead.current_status,
      p_next_status: closeStatus,
      p_lead_condition: form.lead_condition,
      p_objection_category: form.objection_category,
      p_solution_given: form.solution_given,
      p_result: form.result || null,
      p_notes: form.notes || null,
      p_funnel_notes: form.notes || selectedLead.funnel_notes || null,
      p_follow_up_id: selectedItem?.followUp?.id || null,
      p_complete_follow_up: Boolean(selectedItem?.followUp),
      p_close_lead: true,
      p_lost_status: closeStatus,
      p_lost_reason: lostReason,
    })

    setSaving(false)

    if (error) {
      setMessage({ type: 'error', text: `Gagal menutup lead: ${error.message}` })
      return
    }

    const result = parseRpcResult(data)
    if (!result?.ok) {
      setMessage({ type: 'error', text: result?.message || 'Gagal menutup lead.' })
      return
    }

    setMessage({
      type: 'success',
      text: `Lead ditutup sebagai ${closeStatus}. Lead keluar dari antrian kerja.`,
    })
    setForm(EMPTY_FORM)
    setWorkflowOutcome('active')
    setCloseStatus('Not Interested')
    setLostReason('')
    setSelectedLeadId(null)
    await fetchData()
  }

  const saveWork = async () => {
    if (!selectedLead || saving) return
    if (!form.lead_condition || !form.objection_category || !form.solution_given || !form.next_action) {
      setMessage({ type: 'error', text: 'Lengkapi kondisi, kendala, solusi, dan next action dulu.' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })

    const { data, error } = await supabase.rpc('save_work_queue_fast', {
      p_lead_id: selectedLead.id,
      p_current_status: selectedLead.current_status,
      p_next_status: nextStatus,
      p_lead_condition: form.lead_condition,
      p_objection_category: form.objection_category,
      p_solution_given: form.solution_given,
      p_expert_needed: form.expert_needed,
      p_expert_type: form.expert_needed ? form.expert_type || null : null,
      p_commercial_type: form.commercial_type,
      p_service_opportunity: form.service_opportunity || null,
      p_next_action: form.next_action,
      p_next_follow_up_date: form.next_follow_up_date || null,
      p_result: form.result || null,
      p_notes: form.notes || null,
      p_funnel_notes: form.notes || selectedLead.funnel_notes || null,
      p_follow_up_id: selectedItem?.followUp?.id || null,
      p_complete_follow_up: Boolean(selectedItem?.followUp),
      p_close_lead: false,
    })

    setSaving(false)

    if (error) {
      setMessage({ type: 'error', text: `Gagal menyimpan: ${error.message}` })
      return
    }

    const result = parseRpcResult(data)
    if (!result?.ok) {
      setMessage({ type: 'error', text: result?.message || 'Gagal menyimpan.' })
      return
    }

    setMessage({ type: 'success', text: 'Tersimpan. Catatan masuk ke report, follow-up, dan antrian terkait.' })
    setForm(EMPTY_FORM)
    setShowAdvanced(false)
    await fetchData()
  }

  const handlePrimarySave = () => {
    if (isCloseFlow) void saveCloseLead()
    else void saveWork()
  }

  return (
    <>
      <Header
        title="Kerjaan CRO"
        subtitle="Satu meja kerja: pilih lead → langkah 1–5 → simpan. Tanpa bolak-balik halaman."
      />
      <div className="w-full p-3 sm:p-5 animate-fade-in font-sans">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-lg font-semibold text-foreground tracking-tight">Meja kerja harian</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kiri = antrian. Kanan = langkah berurutan. Detail lengkap di halaman Lead.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
            <Link href="/follow-ups" className="text-muted-foreground hover:text-foreground">
              FU jatuh tempo
            </Link>
            <span className="text-border">·</span>
            <Link href="/needs-action" className="text-muted-foreground hover:text-foreground">
              Needs Action
            </Link>
            <span className="text-border">·</span>
            <Link href="/today" className="text-accent hover:opacity-80">
              Semua antrian
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[20rem_minmax(0,1fr)] gap-3 items-start">
          {/* Left queue */}
          <aside className="rounded-2xl border border-border bg-card p-3 xl:sticky xl:top-20 shadow-sm">
            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama / WA / campaign..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-xs border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <label className="mb-2 block">
              <span className="sr-only">Filter antrian</span>
              <select
                value={queueFilter}
                onChange={(e) => setQueueFilter(e.target.value as QueueFilter)}
                className="w-full rounded-lg border border-border bg-secondary/60 px-2.5 py-2 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              >
                {QUEUE_FILTERS.map((filter) => (
                  <option key={filter.key} value={filter.key}>
                    {filter.label} ({queueCounts[filter.key]})
                  </option>
                ))}
              </select>
            </label>

            <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                  <Loader2 size={14} className="animate-spin" /> Memuat antrian...
                </div>
              ) : queueItems.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">Antrian kosong untuk filter ini.</p>
              ) : (
                queueItems.map((item) => {
                  const active = selectedLead?.id === item.lead.id
                  const itemStage = getFunnelStage(item.lead.current_status)
                  return (
                    <button
                      key={item.lead.id}
                      type="button"
                      onClick={() => chooseLead(item.lead.id)}
                      className={cn(
                        'w-full text-left rounded-xl border px-3 py-2.5 transition-colors',
                        active
                          ? 'border-primary/30 bg-secondary'
                          : 'border-border bg-card hover:bg-secondary/50'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground truncate">{item.lead.full_name}</p>
                        <span className="text-[9px] font-bold text-accent flex-shrink-0">{item.reason}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {item.lead.source_campaign}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={cn('text-[9px] px-1.5 py-0.5 rounded-md', getStageBadgeClasses(item.lead.current_status))}>
                          {itemStage ? `T${itemStage.id}` : '—'} {item.lead.current_status}
                        </span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </aside>

          {/* Right form */}
          <main className="rounded-2xl border border-border bg-card p-3 sm:p-4 min-h-[28rem] shadow-sm">
            {!selectedLead ? (
              <div className="h-full min-h-[20rem] flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
                <ClipboardCheck size={28} className="opacity-40" />
                <p className="text-sm font-medium">Pilih lead dari antrian kiri</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-border">
                  <div className="min-w-0">
                    <h2 className="font-display text-xl font-semibold tracking-tight text-foreground truncate">
                      {selectedLead.full_name}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedLead.whatsapp_number} · {selectedLead.source_campaign} · PIC:{' '}
                      {selectedLead.users?.name || '—'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-md', getStageBadgeClasses(selectedLead.current_status))}>
                        {stage ? `Tahap ${stage.id} · ${stage.labelId}` : selectedLead.current_status}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{selectedLead.current_status}</span>
                      {selectedItem?.followUp && (
                        <span className="text-[10px] font-semibold text-accent">
                          FU {formatDate(selectedItem.followUp.scheduled_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full sm:w-44 shrink-0">
                    <WhatsAppButton
                      leadName={selectedLead.full_name}
                      leadPhone={selectedLead.whatsapp_number}
                      leadId={selectedLead.id}
                      picName={selectedLead.users?.name}
                    />
                  </div>
                </div>

                {message.text && (
                  <div
                    className={cn(
                      'rounded-xl border px-3 py-2.5 text-xs font-medium',
                      message.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'border-destructive/20 bg-destructive/5 text-destructive'
                    )}
                  >
                    {message.text}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex rounded-lg border border-border p-0.5 bg-secondary/50">
                    <button
                      type="button"
                      onClick={() => setWorkflowOutcome('active')}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                        !isCloseFlow
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Lanjut kerja
                    </button>
                    <button
                      type="button"
                      onClick={() => setWorkflowOutcome('close')}
                      className={cn(
                        'px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                        isCloseFlow
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      Tidak lanjut
                    </button>
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground tabular-nums">
                    {doneCount}/5 · mulai dari WA
                  </p>
                </div>

                <nav aria-label="Langkah kerja" className="grid grid-cols-5 gap-1">
                  {workSteps.map((step) => {
                    const done = stepDone[step.n]
                    const current = step.n === focusStep
                    return (
                      <a
                        key={step.n}
                        href={`#wq-step-${step.n}`}
                        className={cn(
                          'flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 text-center transition-colors',
                          done
                            ? 'border-primary/30 bg-primary/5 text-foreground'
                            : current
                              ? 'border-accent bg-accent/10 text-foreground'
                              : 'border-border bg-background text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <span
                          className={cn(
                            'work-step-num',
                            done && 'work-step-num-done',
                            current && !done && 'work-step-num-current'
                          )}
                        >
                          {done ? '✓' : step.n}
                        </span>
                        <span className="text-[9px] font-semibold leading-tight truncate w-full">
                          {step.title}
                        </span>
                      </a>
                    )
                  })}
                </nav>

                <div className="space-y-1.5 animate-fade-in">
                  <WorkStep
                    n={1}
                    title={workSteps[0].title}
                    hint={workSteps[0].hint}
                    done={stepDone[1]}
                    current={focusStep === 1}
                  >
                    <select
                      value={form.lead_condition}
                      onChange={(e) => updateForm('lead_condition', e.target.value)}
                      className="field-input"
                    >
                      {LEAD_CONDITION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </WorkStep>

                  <WorkStep
                    n={2}
                    title={workSteps[1].title}
                    hint={workSteps[1].hint}
                    done={stepDone[2]}
                    current={focusStep === 2}
                  >
                    <select
                      value={form.objection_category}
                      onChange={(e) => updateForm('objection_category', e.target.value)}
                      className="field-input"
                    >
                      <option value="">Pilih kendala...</option>
                      {OBJECTION_CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </WorkStep>

                  <WorkStep
                    n={3}
                    title={workSteps[2].title}
                    hint={workSteps[2].hint}
                    done={stepDone[3]}
                    current={focusStep === 3}
                  >
                    <select
                      value={form.solution_given}
                      onChange={(e) => updateForm('solution_given', e.target.value)}
                      className="field-input"
                    >
                      <option value="">Pilih solusi...</option>
                      {SOLUTION_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </WorkStep>

                  {!isCloseFlow ? (
                    <>
                      <WorkStep
                        n={4}
                        title={workSteps[3].title}
                        hint={workSteps[3].hint}
                        done={stepDone[4]}
                        current={focusStep === 4}
                      >
                        <select
                          value={form.next_action}
                          onChange={(e) => updateForm('next_action', e.target.value)}
                          className="field-input"
                        >
                          {NEXT_ACTION_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </WorkStep>
                      <WorkStep
                        n={5}
                        title={workSteps[4].title}
                        hint={workSteps[4].hint}
                        done={stepDone[5]}
                        current={focusStep === 5}
                        optional
                      >
                        <input
                          type="date"
                          value={form.next_follow_up_date}
                          onChange={(e) => updateForm('next_follow_up_date', e.target.value)}
                          className="field-input"
                        />
                      </WorkStep>
                      <p className="text-[11px] text-muted-foreground px-1">
                        Setelah simpan, status menjadi:{' '}
                        <span className="font-semibold text-foreground">{nextStatus}</span>
                      </p>
                    </>
                  ) : (
                    <>
                      <WorkStep
                        n={4}
                        title={workSteps[3].title}
                        hint={workSteps[3].hint}
                        done={stepDone[4]}
                        current={focusStep === 4}
                      >
                        <select
                          value={closeStatus}
                          onChange={(e) => setCloseStatus(e.target.value as LostStatus)}
                          className="field-input"
                        >
                          <option value="Not Interested">Not Interested</option>
                          <option value="Not Eligible">Not Eligible</option>
                        </select>
                      </WorkStep>
                      <WorkStep
                        n={5}
                        title={workSteps[4].title}
                        hint={workSteps[4].hint}
                        done={stepDone[5]}
                        current={focusStep === 5}
                      >
                        <select
                          value={lostReason}
                          onChange={(e) => setLostReason(e.target.value)}
                          className="field-input"
                        >
                          <option value="">Pilih alasan...</option>
                          {LOST_REASON_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </WorkStep>
                    </>
                  )}
                </div>

                <details
                  open={showAdvanced}
                  onToggle={(e) => setShowAdvanced((e.target as HTMLDetailsElement).open)}
                  className="rounded-lg border border-border bg-secondary/40 px-3 py-2"
                >
                  <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Opsi lanjutan</p>
                        <p className="text-[10px] text-muted-foreground">
                          Hasil chat, komersial, expert — tidak wajib.
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {showAdvanced ? 'Tutup' : 'Buka'}
                      </span>
                    </div>
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pb-1 animate-scale-in">
                    <Field label="Hasil chat">
                      <input
                        value={form.result}
                        onChange={(e) => updateForm('result', e.target.value)}
                        className="field-input"
                        placeholder="Ringkas hasil..."
                      />
                    </Field>
                    <Field label="Tipe komersial">
                      <select
                        value={form.commercial_type}
                        onChange={(e) => updateForm('commercial_type', e.target.value)}
                        className="field-input"
                      >
                        {COMMERCIAL_TYPE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Peluang layanan">
                      <input
                        value={form.service_opportunity}
                        onChange={(e) => updateForm('service_opportunity', e.target.value)}
                        className="field-input"
                        placeholder="Opsional"
                      />
                    </Field>
                    <Field label="Butuh expert?">
                      <label className="flex items-center gap-2 text-xs text-foreground h-[38px]">
                        <input
                          type="checkbox"
                          checked={form.expert_needed}
                          onChange={(e) => updateForm('expert_needed', e.target.checked)}
                        />
                        Ya, butuh dibantu
                      </label>
                    </Field>
                    {form.expert_needed && (
                      <Field label="Tipe expert" className="sm:col-span-2">
                        <select
                          value={form.expert_type}
                          onChange={(e) => updateForm('expert_type', e.target.value)}
                          className="field-input"
                        >
                          <option value="">Pilih...</option>
                          {EXPERT_TYPE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </Field>
                    )}
                    <Field label="Catatan" className="sm:col-span-2">
                      <textarea
                        value={form.notes}
                        onChange={(e) => updateForm('notes', e.target.value)}
                        className="field-input min-h-[72px] resize-y"
                        placeholder="Opsional"
                      />
                    </Field>
                  </div>
                </details>

                <div className="sticky bottom-0 -mx-3 sm:-mx-4 px-3 sm:px-4 py-3 mt-2 border-t border-border bg-card/95 backdrop-blur flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={`/leads/${selectedLead.id}`}
                    className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Detail lead →
                  </Link>
                  <button
                    type="button"
                    disabled={saving || !canSave()}
                    onClick={handlePrimarySave}
                    className={cn(
                      'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed',
                      isCloseFlow
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-accent-foreground'
                    )}
                  >
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {isCloseFlow ? 'Simpan · tidak lanjut' : 'Simpan langkah'}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

    </>
  )
}

function WorkStep({
  n,
  title,
  hint,
  done,
  current,
  optional,
  children,
}: {
  n: number
  title: string
  hint: string
  done: boolean
  current: boolean
  optional?: boolean
  children: ReactNode
}) {
  return (
    <section
      id={`wq-step-${n}`}
      className={cn(
        'rounded-lg border px-2.5 py-2 transition-colors scroll-mt-24',
        done
          ? 'border-primary/25 bg-primary/[0.03]'
          : current
            ? 'border-accent border-l-[3px] bg-card shadow-sm'
            : 'border-border/80 bg-background'
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            'work-step-num',
            done && 'work-step-num-done',
            current && !done && 'work-step-num-current'
          )}
          aria-hidden
        >
          {done ? '✓' : n}
        </span>
        <label className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-[8.5rem_minmax(0,1fr)] gap-1 sm:gap-3 sm:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-foreground">
                {title}
              </span>
              {optional && (
                <span className="text-[10px] font-medium text-muted-foreground">opsional</span>
              )}
            </div>
            {current && (
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{hint}</p>
            )}
          </div>
          <div>{children}</div>
        </label>
      </div>
    </section>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="text-[11px] font-semibold text-foreground/80">{label}</span>
      {children}
    </label>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/client'
import { WhatsAppModal } from '@/components/leads/WhatsAppModal'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  MessageCircle,
  Search,
  Sparkles,
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

const STEP_LABELS = ['Hubungi', 'Catat Chat', 'Langkah Berikutnya', 'Cek Ulang']
const QUEUE_FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'fu', label: 'FU Hari Ini' },
  { key: 'needs', label: 'Needs Action' },
  { key: 'new', label: 'New Lead' },
  { key: 'stale', label: 'Belum Disentuh' },
] as const

type QueueFilter = typeof QUEUE_FILTERS[number]['key']

function todayInput() {
  return new Date().toISOString().split('T')[0]
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

function isClosedStatus(status: string) {
  return ['Seat Lock Paid', 'Onboarding', 'Not Interested', 'Not Eligible'].includes(status)
}

function isStaleLead(lead: LeadRow) {
  return !isClosedStatus(lead.current_status) && daysSinceTouch(lead) >= 3
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
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<WorkForm>(EMPTY_FORM)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })
  const [waLead, setWaLead] = useState<LeadRow | null>(null)

  async function fetchData() {
    setLoading(true)
    const today = todayInput()
    const requestedLeadId = searchParams.get('lead')

    const [leadsRes, followUpsRes] = await Promise.all([
      supabase
        .from('leads')
        .select('id, full_name, whatsapp_number, email, source_campaign, current_status, lead_entry_date, last_contacted_date, updated_at, assigned_cro_id, next_action, next_follow_up_date, lead_segment, funnel_notes, users:assigned_cro_id(id, name)')
        .order('lead_entry_date', { ascending: false })
        .limit(10000),
      supabase
        .from('follow_ups')
        .select('id, lead_id, scheduled_date, fu_type, notes, leads:lead_id(id, full_name, whatsapp_number, email, source_campaign, current_status, lead_entry_date, last_contacted_date, updated_at, assigned_cro_id, next_action, next_follow_up_date, lead_segment, funnel_notes, users:assigned_cro_id(id, name))')
        .eq('is_done', false)
        .lte('scheduled_date', today)
        .order('scheduled_date', { ascending: true })
        .limit(10000),
    ])

    const nextLeads = ((leadsRes.data || []) as any[]).filter(lead =>
      lead.current_status === 'New Lead' || NEEDS_ACTION_STATUSES.includes(lead.current_status) || isStaleLead(lead)
    )
    const nextFollowUps = (followUpsRes.data || []) as any[]

    if (requestedLeadId) {
      const alreadyLoaded = nextLeads.some(lead => lead.id === requestedLeadId)
        || nextFollowUps.some(fu => fu.leads?.id === requestedLeadId)

      if (!alreadyLoaded) {
        const { data: requestedLead } = await supabase
          .from('leads')
          .select('id, full_name, whatsapp_number, email, source_campaign, current_status, lead_entry_date, last_contacted_date, updated_at, assigned_cro_id, next_action, next_follow_up_date, lead_segment, funnel_notes, users:assigned_cro_id(id, name)')
          .eq('id', requestedLeadId)
          .maybeSingle()

        if (requestedLead) {
          nextLeads.unshift(requestedLead as any)
        }
      }
    }

    setLeads(nextLeads)
    setFollowUps(nextFollowUps)
    setSelectedLeadId(prev => requestedLeadId || prev || nextFollowUps[0]?.leads?.id || nextLeads[0]?.id || null)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

    followUps.forEach(fu => {
      if (!fu.leads) return
      map.set(fu.leads.id, {
        lead: fu.leads,
        reason: 'FU Hari Ini',
        priority: 1,
        followUp: fu,
      })
    })

    leads.forEach(lead => {
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
      .filter(item => !keyword || [
        item.lead.full_name,
        item.lead.whatsapp_number,
        item.lead.source_campaign,
        item.lead.current_status,
        item.reason,
      ].some(value => String(value || '').toLowerCase().includes(keyword)))
      .filter(item => {
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
    followUps.forEach(fu => {
      if (!fu.leads) return
      allItems.set(fu.leads.id, { lead: fu.leads, reason: 'FU Hari Ini', priority: 1, followUp: fu })
    })
    leads.forEach(lead => {
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
      fu: items.filter(item => item.reason === 'FU Hari Ini').length,
      needs: items.filter(item => item.reason === 'Needs Action').length,
      new: items.filter(item => item.reason === 'New Lead').length,
      stale: items.filter(item => item.reason === 'Belum Disentuh').length,
    }
  }, [followUps, leads])

  const selectedItem = queueItems.find(item => item.lead.id === selectedLeadId) || (!selectedLeadId ? queueItems[0] : null)
  const selectedLead = selectedItem?.lead || null
  const nextStatus = selectedLead ? inferNextStatus(selectedLead.current_status, form.next_action) : '-'

  const updateForm = (field: keyof WorkForm, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const chooseLead = (leadId: string) => {
    setSelectedLeadId(leadId)
    setStep(0)
    setMessage({ type: '', text: '' })
    setForm(EMPTY_FORM)
  }

  const canContinue = () => {
    if (step === 1) return Boolean(form.lead_condition && form.objection_category && form.solution_given)
    if (step === 2) return Boolean(form.next_action)
    return true
  }

  const saveWork = async () => {
    if (!selectedLead || saving) return
    if (!form.lead_condition || !form.objection_category || !form.solution_given || !form.next_action) {
      setMessage({ type: 'error', text: 'Lengkapi kondisi lead, objection, solusi, dan next action dulu.' })
      return
    }

    setSaving(true)
    setMessage({ type: '', text: '' })
    const { data: authData } = await supabase.auth.getUser()
    const actorId = authData.user?.id || null
    const now = new Date().toISOString()

    const interventionPayload = {
      lead_id: selectedLead.id,
      created_by: actorId,
      lead_condition: form.lead_condition,
      objection_category: form.objection_category,
      solution_given: form.solution_given,
      expert_needed: form.expert_needed,
      expert_type: form.expert_needed ? form.expert_type || null : null,
      commercial_type: form.commercial_type,
      service_opportunity: form.service_opportunity || null,
      next_action: form.next_action,
      next_follow_up_date: form.next_follow_up_date || null,
      result: form.result || null,
      notes: form.notes || null,
    }

    const promises: Promise<any>[] = [
      supabase.from('lead_interventions').insert(interventionPayload),
      supabase.from('leads').update({
        current_status: nextStatus,
        lead_segment: form.objection_category,
        next_action: form.next_action,
        next_follow_up_date: form.next_follow_up_date || null,
        funnel_notes: form.notes || selectedLead.funnel_notes || null,
        last_contacted_date: now,
        updated_by: actorId,
        updated_at: now,
      }).eq('id', selectedLead.id),
      supabase.from('lead_activities').insert({
        lead_id: selectedLead.id,
        activity_type: 'Intervention Logged',
        description: `${form.lead_condition} | Objection: ${form.objection_category} | Solusi: ${form.solution_given}`,
        created_by: actorId,
      }),
    ]

    if (nextStatus !== selectedLead.current_status) {
      promises.push(
        supabase.from('lead_activities').insert({
          lead_id: selectedLead.id,
          activity_type: 'Status changed',
          description: `${selectedLead.current_status} -> ${nextStatus} via Work Queue`,
          created_by: actorId,
        })
      )
    }

    if (form.next_follow_up_date) {
      promises.push(
        supabase.from('follow_ups').insert({
          lead_id: selectedLead.id,
          scheduled_date: form.next_follow_up_date,
          fu_type: 'whatsapp',
          notes: form.notes || form.result || `Next action: ${form.next_action}`,
          pic_id: actorId,
        })
      )
    }

    if (selectedItem?.followUp) {
      promises.push(
        supabase.from('follow_ups').update({
          is_done: true,
          done_at: now,
          result: form.result || form.notes || 'Selesai via Work Queue',
          updated_at: now,
        }).eq('id', selectedItem.followUp.id)
      )
    }

    const results = await Promise.all(promises)
    const firstError = results.find(result => result.error)?.error
    setSaving(false)

    if (firstError) {
      setMessage({ type: 'error', text: `Gagal menyimpan workflow: ${firstError.message}` })
      return
    }

    setMessage({ type: 'success', text: 'Catatan tersimpan. Data masuk ke Report Harian, Alasan Gagal, follow-up, dan Butuh Dibantu bila relevan.' })
    setStep(0)
    setForm(EMPTY_FORM)
    await fetchData()
  }

  return (
    <>
      <Header title="Kerjaan Hari Ini" subtitle="Tempat utama CRO bekerja: hubungi lead, catat hasil chat, pilih langkah berikutnya, lalu simpan." />
      <div className="w-full p-6 animate-fade-in">
        <div className="mb-4 rounded-2xl border border-emerald-500/15 bg-emerald-500/5 px-5 py-4">
          <p className="text-sm font-extrabold text-foreground">Kerjaan Hari Ini = tempat utama CRO bekerja</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Ikuti step dari kiri ke kanan: buka WhatsApp, catat kondisi dan kendala lead, pilih langkah berikutnya, lalu simpan. Data yang disimpan otomatis masuk ke Report Harian, Alasan Gagal, follow-up, dan Butuh Dibantu bila relevan.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Antrian Kerja</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Kerjakan dari urutan teratas.</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black text-primary">{queueItems.length}</span>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Cari lead, WA, campaign..."
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUEUE_FILTERS.map(filter => {
                  const active = queueFilter === filter.key
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => {
                        setQueueFilter(filter.key)
                        setSelectedLeadId(null)
                      }}
                      className={`rounded-full border px-3 py-1 text-[10px] font-black transition-all ${
                        active
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {filter.label} {queueCounts[filter.key]}
                    </button>
                  )
                })}
              </div>
              <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
                Urutan: FU hari ini paling atas, lalu needs action, new lead terbaru, lalu lead lama yang belum disentuh.
              </p>
            </div>

            <div className="max-h-[calc(100vh-14rem)] overflow-y-auto p-2">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="animate-spin" size={16} />
                  Memuat queue...
                </div>
              ) : queueItems.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada pekerjaan aktif.</p>
              ) : queueItems.map(item => {
                const active = selectedLead?.id === item.lead.id
                return (
                  <button
                    key={item.lead.id}
                    type="button"
                    onClick={() => chooseLead(item.lead.id)}
                    className={`mb-2 w-full rounded-xl border p-3 text-left transition-all ${
                      active
                        ? 'border-primary/30 bg-primary/10'
                        : 'border-border bg-background hover:border-primary/20 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-foreground">{item.lead.full_name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.lead.source_campaign}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${
                        item.reason === 'FU Hari Ini'
                          ? 'bg-red-500/10 text-red-600 dark:text-red-300'
                          : item.reason === 'Needs Action'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                            : item.reason === 'Belum Disentuh'
                              ? 'bg-slate-500/10 text-slate-600 dark:text-slate-300'
                              : 'bg-blue-500/10 text-blue-600 dark:text-blue-300'
                      }`}>
                        {item.reason}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/70 pt-2 text-[10px] text-muted-foreground">
                      <span>{item.lead.current_status}</span>
                      <span>{item.followUp ? `FU ${formatDate(item.followUp.scheduled_date)}` : formatDate(item.lead.lead_entry_date)}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>

          <main className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            {!selectedLead ? (
              <div className="flex min-h-[32rem] flex-col items-center justify-center gap-3 p-8 text-center">
                <ClipboardCheck size={34} className="text-muted-foreground/40" />
                <p className="text-sm font-bold text-foreground">Pilih lead dari antrian kerja.</p>
                <p className="max-w-sm text-xs text-muted-foreground">Setelah lead dipilih, sistem akan memandu langkah kerja dari WA sampai simpan handling.</p>
              </div>
            ) : (
              <div>
                <div className="border-b border-border p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-[10px] font-extrabold uppercase tracking-wide text-primary">{selectedItem?.reason}</p>
                      <h1 className="mt-1 text-2xl font-black text-foreground">{selectedLead.full_name}</h1>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedLead.whatsapp_number} / {selectedLead.source_campaign}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{selectedLead.current_status}</span>
                      <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold text-foreground">{selectedLead.users?.name || 'Unassigned'}</span>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {STEP_LABELS.map((label, index) => (
                      <div key={label} className={`rounded-xl border px-3 py-2 ${
                        index === step
                          ? 'border-primary/30 bg-primary/10 text-primary'
                          : index < step
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                            : 'border-border bg-background text-muted-foreground'
                      }`}>
                        <p className="text-[10px] font-black uppercase">Step {index + 1}</p>
                        <p className="mt-0.5 truncate text-xs font-bold">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="min-h-[26rem] p-6">
                  {message.text && (
                    <div className={`mb-5 rounded-xl border p-3 text-sm font-bold ${
                      message.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
                    }`}>
                      {message.text}
                    </div>
                  )}

                  {step === 0 && (
                    <section className="mx-auto max-w-2xl space-y-5 text-center">
                      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                        <MessageCircle size={28} />
                      </div>
                      <div>
                        <h2 className="text-xl font-black text-foreground">Step 1: Hubungi lead via WhatsApp</h2>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Mulai dari komunikasi. Setelah WhatsApp terbuka dan pesan dikirim, lanjut ke pencatatan handling.</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-background p-5 text-left">
                        <p className="text-xs font-bold uppercase text-muted-foreground">Data Lead</p>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <Info label="Nama" value={selectedLead.full_name} />
                          <Info label="WhatsApp" value={selectedLead.whatsapp_number} />
                          <Info label="Campaign" value={selectedLead.source_campaign} />
                          <Info label="Status" value={selectedLead.current_status} />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWaLead(selectedLead)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-extrabold text-white hover:bg-emerald-700 sm:w-auto"
                      >
                        <MessageCircle size={18} />
                        Buka WhatsApp
                      </button>
                    </section>
                  )}

                  {step === 1 && (
                    <section className="mx-auto max-w-3xl space-y-5">
                      <div>
                      <h2 className="text-xl font-black text-foreground">Step 2: Catat hasil chat</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Isi kondisi lead, kendala yang muncul, dan respon CRO. Ini yang menjadi sumber Report Harian dan Alasan Gagal.</p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field label="Kondisi Lead">
                          <select value={form.lead_condition} onChange={e => updateForm('lead_condition', e.target.value)} className="input-work">
                            <option value="">Pilih kondisi</option>
                            {LEAD_CONDITION_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </Field>
                        <Field label="Kendala Lead">
                          <select value={form.objection_category} onChange={e => updateForm('objection_category', e.target.value)} className="input-work">
                            <option value="">Pilih objection</option>
                            {OBJECTION_CATEGORY_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </Field>
                        <Field label="Respon CRO">
                          <select value={form.solution_given} onChange={e => updateForm('solution_given', e.target.value)} className="input-work">
                            <option value="">Pilih solusi</option>
                            {SOLUTION_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </Field>
                        <Field label="Hasil Chat Singkat">
                          <input value={form.result} onChange={e => updateForm('result', e.target.value)} placeholder="Contoh: masih dipertimbangkan..." className="input-work" />
                        </Field>
                        <div className="md:col-span-2">
                          <Field label="Notes">
                            <textarea value={form.notes} onChange={e => updateForm('notes', e.target.value)} rows={4} placeholder="Catatan percakapan singkat..." className="input-work resize-none" />
                          </Field>
                        </div>
                      </div>
                    </section>
                  )}

                  {step === 2 && (
                    <section className="mx-auto max-w-3xl space-y-5">
                      <div>
                        <h2 className="text-xl font-black text-foreground">Step 3: Tentukan langkah berikutnya</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Pilihan ini akan menyarankan status setelah disimpan. Kalau ada tanggal follow-up, sistem otomatis membuat jadwal follow-up.</p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <Field label="Langkah Berikutnya">
                          <select value={form.next_action} onChange={e => updateForm('next_action', e.target.value)} className="input-work">
                            <option value="">Pilih next action</option>
                            {NEXT_ACTION_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </Field>
                        <Field label="Tanggal Follow-Up">
                          <input type="date" value={form.next_follow_up_date} onChange={e => updateForm('next_follow_up_date', e.target.value)} className="input-work" />
                        </Field>
                        <Field label="Gratis / Berbayar">
                          <select value={form.commercial_type} onChange={e => updateForm('commercial_type', e.target.value)} className="input-work">
                            {COMMERCIAL_TYPE_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                          </select>
                        </Field>
                        <Field label="Perlu Dibantu">
                          <select value={form.expert_needed ? 'yes' : 'no'} onChange={e => updateForm('expert_needed', e.target.value === 'yes')} className="input-work">
                            <option value="no">Tidak</option>
                            <option value="yes">Ya</option>
                          </select>
                        </Field>
                        {form.expert_needed && (
                          <Field label="Dibantu Oleh">
                            <select value={form.expert_type} onChange={e => updateForm('expert_type', e.target.value)} className="input-work">
                              <option value="">Pilih expert</option>
                              {EXPERT_TYPE_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                            </select>
                          </Field>
                        )}
                        <Field label="Catatan Potensi Tambahan">
                          <input value={form.service_opportunity} onChange={e => updateForm('service_opportunity', e.target.value)} placeholder="Contoh: kelas bahasa / dokumen..." className="input-work" />
                        </Field>
                      </div>
                      <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                        <p className="text-[10px] font-black uppercase text-primary">Status setelah simpan</p>
                        <p className="mt-1 text-lg font-black text-foreground">{nextStatus}</p>
                      </div>
                    </section>
                  )}

                  {step === 3 && (
                    <section className="mx-auto max-w-3xl space-y-5">
                      <div>
                        <h2 className="text-xl font-black text-foreground">Step 4: Cek ulang & simpan</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Pastikan ringkasan sudah benar. Setelah simpan, data otomatis masuk ke output report dan analytics.</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-background p-5">
                        <div className="mb-4 flex items-start gap-3">
                          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Sparkles size={18} />
                          </div>
                          <div>
                            <p className="text-lg font-black text-foreground">{selectedLead.full_name}</p>
                            <p className="text-xs text-muted-foreground">{selectedLead.current_status} {'->'} {nextStatus}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <Info label="Kondisi" value={form.lead_condition || '-'} />
                          <Info label="Kendala" value={form.objection_category || '-'} />
                          <Info label="Respon CRO" value={form.solution_given || '-'} />
                          <Info label="Langkah Berikutnya" value={form.next_action || '-'} />
                          <Info label="Next FU" value={form.next_follow_up_date ? formatDate(form.next_follow_up_date) : '-'} />
                          <Info label="Gratis / Berbayar" value={form.commercial_type || 'Free'} />
                          <Info label="Perlu Dibantu" value={form.expert_needed ? form.expert_type || 'Ya' : 'Tidak'} />
                          <Info label="Hasil Chat" value={form.result || '-'} />
                        </div>
                      </div>
                    </section>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-border bg-background/60 p-5">
                  <button
                    type="button"
                    onClick={() => setStep(prev => Math.max(0, prev - 1))}
                    disabled={step === 0 || saving}
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowLeft size={15} />
                    Back
                  </button>
                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={() => setStep(prev => Math.min(3, prev + 1))}
                      disabled={!canContinue()}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Lanjut
                      <ArrowRight size={15} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={saveWork}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="animate-spin" size={15} /> : <CheckCircle2 size={15} />}
                      Simpan Catatan
                    </button>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {waLead && (
        <WhatsAppModal
          isOpen={Boolean(waLead)}
          onClose={() => setWaLead(null)}
          leadName={waLead.full_name}
          leadPhone={waLead.whatsapp_number}
          leadId={waLead.id}
        />
      )}

      <style jsx global>{`
        .input-work {
          width: 100%;
          border-radius: 0.875rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          color: hsl(var(--foreground));
          padding: 0.75rem 0.875rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input-work:focus {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 1px hsl(var(--primary));
        }
      `}</style>
    </>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

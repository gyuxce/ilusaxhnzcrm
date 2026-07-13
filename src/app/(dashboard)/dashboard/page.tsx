'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  Flame,
  TrendingUp,
  DollarSign,
  Award,
  AlertTriangle,
  Clock3,
  Target,
  BriefcaseBusiness,
  ArrowRight,
} from 'lucide-react'
import { getTodayInWIB } from '@/lib/utils'
import { Header } from '@/components/layout/header'
import type { BatchTargetRow, LeadInterventionRow, LeadRow, PaymentRow } from '@/lib/supabase/types'

interface DashboardStats {
  totalLeads: number
  newLeads: number
  pitching: number
  interestedLeads: number
  notInterested: number
  notEligible: number
  pemetaanScheduled: number
  waitingResult: number
  sentResultPemetaan: number
  expertScheduled: number
  seatLockOffered: number
  seatLockPaid: number
  onboarding: number
  
  revenuePemetaan: number
  revenueSeatLock: number
  revenueCombined: number
}

type DashboardLeadSummary = Pick<LeadRow, 'id' | 'full_name' | 'current_status' | 'source_campaign' | 'updated_at' | 'lead_entry_date'>

type RecentLeadSummary = Pick<LeadRow, 'id' | 'full_name' | 'source_campaign' | 'current_status' | 'lead_entry_date' | 'lead_type'>

type InterventionSummary = Pick<LeadInterventionRow, 'lead_id' | 'objection_category' | 'expert_needed' | 'expert_type' | 'commercial_type' | 'result' | 'created_at'>

type PaymentSummary = Pick<PaymentRow, 'payment_type' | 'amount'>

interface CampaignProgress {
  name: string
  totalLeads: number
  seatLocks: number
  targetSeatLock: number
  progressPct: number
  closingDate: string | null
  notes: string | null
  hasManualTarget: boolean
}

interface FunnelInsight {
  label: string
  reached: number
  conversion: number
}

interface CampaignInsight {
  name: string
  total: number
  qualified: number
  seatLocks: number
  conversion: number
}

interface IntelligenceStats {
  funnel: FunnelInsight[]
  campaigns: CampaignInsight[]
  staleLeads: number
  stalePreview: { id: string; name: string; status: string; days: number }[]
  expertPending: number
  potentialPaidPending: number
  topObjection: string
  topObjectionCount: number
  biggestDrop: { from: string; to: string; count: number; pct: number } | null
}

const EMPTY_INTELLIGENCE: IntelligenceStats = {
  funnel: [],
  campaigns: [],
  staleLeads: 0,
  stalePreview: [],
  expertPending: 0,
  potentialPaidPending: 0,
  topObjection: '-',
  topObjectionCount: 0,
  biggestDrop: null,
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    newLeads: 0,
    pitching: 0,
    interestedLeads: 0,
    notInterested: 0,
    notEligible: 0,
      pemetaanScheduled: 0,
      waitingResult: 0,
      sentResultPemetaan: 0,
      expertScheduled: 0,
    seatLockOffered: 0,
    seatLockPaid: 0,
    onboarding: 0,
    revenuePemetaan: 0,
    revenueSeatLock: 0,
    revenueCombined: 0
  })
  
  const [batchTarget, setBatchTarget] = useState<BatchTargetRow | null>(null)
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress[]>([])
  const [_loading, setLoading] = useState(true)
  const [_userRole, setUserRole] = useState<string>('cro')
  const [_recentLeads, setRecentLeads] = useState<RecentLeadSummary[]>([])
  const [_fuTodayCount, setFuTodayCount] = useState(0)
  const [intelligence, setIntelligence] = useState<IntelligenceStats>(EMPTY_INTELLIGENCE)
  
  // Edit Batch Target Modal
  const [isEditingTarget, setIsEditingTarget] = useState(false)
  const [newTarget, setNewTarget] = useState(0)
  const [newBatchName, setNewBatchName] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [newNotes, setNewNotes] = useState('')

  const supabase = createClient()

  const fetchStats = useCallback(async () => {
    setLoading(true)
    
    // 1. Fetch user role
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profile) {
        setUserRole(profile.role)
      }
    }

    // 2. Fetch all leads for status counting
    const { data: leads } = await supabase
      .from('leads')
      .select('id, full_name, current_status, source_campaign, updated_at, lead_entry_date')

    const { data: interventions } = await supabase
      .from('lead_interventions')
      .select('lead_id, objection_category, expert_needed, expert_type, commercial_type, result, created_at')
      .order('created_at', { ascending: false })

    // 3. Fetch verified payments for revenue
    const { data: payments } = await supabase
      .from('payments')
      .select('payment_type, amount')
      .eq('verification_status', 'verified')

    // 4. Fetch all batch targets
    const { data: targets } = await supabase
      .from('batch_targets')
      .select('*')
      .order('created_at', { ascending: false })

    // 5. Fetch 6 most recent leads for activity feed
    const { data: recent } = await supabase
      .from('leads')
      .select('id, full_name, source_campaign, current_status, lead_entry_date, lead_type')
      .order('lead_entry_date', { ascending: false })
      .limit(6)
    setRecentLeads((recent || []) as RecentLeadSummary[])

    // 6. Count today's follow-ups
    const today = getTodayInWIB()
    const { count: fuCount } = await supabase
      .from('follow_ups')
      .select('*', { count: 'exact', head: true })
      .eq('is_done', false)
      .lte('scheduled_date', today)
    setFuTodayCount(fuCount || 0)

    const leadRows = (leads || []) as DashboardLeadSummary[]
    const interventionRows = (interventions || []) as InterventionSummary[]
    const paymentRows = (payments || []) as PaymentSummary[]
    const targetRows = (targets || []) as BatchTargetRow[]

    const latestTarget = targetRows.length > 0 ? targetRows[0] : null
    setBatchTarget(latestTarget)
    
    if (latestTarget) {
      setNewTarget(latestTarget.target_seat_lock)
      setNewBatchName(latestTarget.batch_name)
      setNewStartDate(latestTarget.start_date)
      setNewEndDate(latestTarget.closing_date)
      setNewNotes(latestTarget.notes || '')
    }

    // Count states
    let total = 0
    const sc: Record<string, number> = {
      'New Lead': 0,
      'Pitching': 0,
      'Interested': 0,
      'Not Interested': 0,
      'Not Eligible': 0,
      'Pemetaan Scheduled': 0,
      'Waiting Result': 0,
      'Sent Result Pemetaan': 0,
      'Expert Consultation Scheduled': 0,
      'Seat Lock Offered': 0,
      'Seat Lock Paid': 0,
      'Onboarding': 0,
    }

    if (leadRows.length > 0) {
      total = leadRows.length
      leadRows.forEach(lead => {
        const s = lead.current_status
        sc[s] = (sc[s] || 0) + 1
      })
    }

    const targetByName = new Map<string, BatchTargetRow>()
    targetRows.forEach(target => {
      targetByName.set(target.batch_name, target)
    })

    const campaignMap = new Map<string, { totalLeads: number; seatLocks: number }>()
    leadRows.forEach(lead => {
      const campaignName = lead.source_campaign?.trim() || 'No Campaign'
      const current = campaignMap.get(campaignName) || { totalLeads: 0, seatLocks: 0 }
      current.totalLeads += 1

      if (['Seat Lock Paid', 'Onboarding', 'Class Started'].includes(lead.current_status)) {
        current.seatLocks += 1
      }

      campaignMap.set(campaignName, current)
    })

    targetRows.forEach(target => {
      if (!campaignMap.has(target.batch_name)) {
        campaignMap.set(target.batch_name, { totalLeads: 0, seatLocks: 0 })
      }
    })

    const progressRows = Array.from(campaignMap.entries())
      .map(([name, value]) => {
        const target = targetByName.get(name)
        const targetSeatLock = target?.target_seat_lock || Math.max(value.totalLeads, 1)
        const progressPct = Math.min(Math.round((value.seatLocks / targetSeatLock) * 100), 100)

        return {
          name,
          totalLeads: value.totalLeads,
          seatLocks: value.seatLocks,
          targetSeatLock,
          progressPct,
          closingDate: target?.closing_date || null,
          notes: target?.notes || null,
          hasManualTarget: Boolean(target),
        }
      })
      .sort((a, b) => b.totalLeads - a.totalLeads || a.name.localeCompare(b.name))

    setCampaignProgress(progressRows)

    const statusRank: Record<string, number> = {
      'New Lead': 0,
      'Pitching': 1,
      'Interested': 2,
      'Pemetaan Scheduled': 3,
      'Waiting Result': 3,
      'Sent Result Pemetaan': 3,
      'Expert Consultation Scheduled': 4,
      'Seat Lock Offered': 5,
      'Seat Lock Paid': 6,
      'Onboarding': 6,
      'Class Started': 6,
    }
    const funnelDefinitions = [
      { label: 'Lead Masuk', rank: 0 },
      { label: 'Pitching', rank: 1 },
      { label: 'Interested', rank: 2 },
      { label: 'Pemetaan', rank: 3 },
      { label: 'Expert', rank: 4 },
      { label: 'Seat Lock', rank: 5 },
    ]
    const activeLeads = leadRows.filter(lead => !['Not Interested', 'Not Eligible'].includes(lead.current_status))
    const funnel = funnelDefinitions.map(stage => {
      const reached = stage.rank === 0
        ? leadRows.length
        : activeLeads.filter(lead => (statusRank[lead.current_status] ?? -1) >= stage.rank).length
      return {
        label: stage.label,
        reached,
        conversion: total > 0 ? Math.round((reached / total) * 100) : 0,
      }
    })
    const funnelDrops = funnel.slice(0, -1).map((stage, index) => {
      const next = funnel[index + 1]
      const count = Math.max(stage.reached - next.reached, 0)
      return {
        from: stage.label,
        to: next.label,
        count,
        pct: stage.reached > 0 ? Math.round((count / stage.reached) * 100) : 0,
      }
    })
    const biggestDrop = funnelDrops.sort((a, b) => b.count - a.count)[0] || null

    const campaignInsights = Array.from(campaignMap.entries())
      .map(([name, value]) => {
        const campaignLeads = leadRows.filter(lead => (lead.source_campaign?.trim() || 'No Campaign') === name)
        const qualified = campaignLeads.filter(lead => (statusRank[lead.current_status] ?? -1) >= 2).length
        return {
          name,
          total: value.totalLeads,
          qualified,
          seatLocks: value.seatLocks,
          conversion: value.totalLeads > 0 ? Math.round((value.seatLocks / value.totalLeads) * 100) : 0,
        }
      })
      .filter(row => row.total > 0)
      .sort((a, b) => b.conversion - a.conversion || b.qualified - a.qualified || b.total - a.total)
      .slice(0, 5)

    const now = Date.now()
    const terminalStatuses = ['Not Interested', 'Not Eligible', 'Seat Lock Paid', 'Onboarding', 'Class Started']
    type StaleRow = { id: string; name: string; status: string; days: number }
    const staleRows: StaleRow[] = leadRows
      .filter(lead => !terminalStatuses.includes(lead.current_status))
      .map(lead => {
        const lastUpdate = lead.updated_at || lead.lead_entry_date
        const days = lastUpdate ? Math.floor((now - new Date(lastUpdate).getTime()) / 86400000) : 0
        return { id: lead.id, name: lead.full_name, status: lead.current_status, days }
      })
      .filter(row => row.days >= 3)
      .sort((a, b) => b.days - a.days)

    const latestInterventionByLead = new Map<string, InterventionSummary>()
    interventionRows.forEach(item => {
      if (!latestInterventionByLead.has(item.lead_id)) latestInterventionByLead.set(item.lead_id, item)
    })
    const latestInterventions = Array.from(latestInterventionByLead.values())
    const objectionCounts: Record<string, number> = {}
    interventionRows.forEach(item => {
      if (item.objection_category) {
        objectionCounts[item.objection_category] = (objectionCounts[item.objection_category] || 0) + 1
      }
    })

    let topObjection = '-'
    let topObjectionCount = 0
    for (const [category, count] of Object.entries(objectionCounts)) {
      if (count > topObjectionCount) {
        topObjection = category
        topObjectionCount = count
      }
    }

    setIntelligence({
      funnel,
      campaigns: campaignInsights,
      staleLeads: staleRows.length,
      stalePreview: staleRows.slice(0, 4),
      expertPending: latestInterventions.filter(item => (item.expert_needed || item.expert_type) && !item.result).length,
      potentialPaidPending: latestInterventions.filter(item => (item.commercial_type || '').toLowerCase().includes('paid') && !item.result).length,
      topObjection,
      topObjectionCount,
      biggestDrop,
    })

    // Calculate revenue
    let revPemetaan = 0
    let revSeatLock = 0
    if (paymentRows.length > 0) {
      paymentRows.forEach(p => {
        const amt = Number(p.amount)
        if (p.payment_type === 'pemetaan' || p.payment_type === 'roadmap_session') {
          revPemetaan += amt
        } else if (p.payment_type === 'seat_lock') {
          revSeatLock += amt
        }
      })
    }

    setStats({
      totalLeads: total,
      newLeads: sc['New Lead'] || 0,
      pitching: sc['Pitching'] || 0,
      interestedLeads: sc['Interested'] || 0,
      notInterested: sc['Not Interested'] || 0,
      notEligible: sc['Not Eligible'] || 0,
      pemetaanScheduled: sc['Pemetaan Scheduled'] || 0,
      waitingResult: sc['Waiting Result'] || 0,
      sentResultPemetaan: sc['Sent Result Pemetaan'] || 0,
      expertScheduled: sc['Expert Consultation Scheduled'] || 0,
      seatLockOffered: sc['Seat Lock Offered'] || 0,
      seatLockPaid: sc['Seat Lock Paid'] || 0,
      onboarding: sc['Onboarding'] || 0,
      revenuePemetaan: revPemetaan,
      revenueSeatLock: revSeatLock,
      revenueCombined: revPemetaan + revSeatLock
    })

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Update target in Supabase
  const handleSaveTarget = async () => {
    if (!batchTarget) {
      // Create new
      const { error } = await supabase
        .from('batch_targets')
        .insert({
          batch_name: newBatchName || 'Batch 1',
          target_seat_lock: newTarget,
          start_date: newStartDate || new Date().toISOString().split('T')[0],
          closing_date: newEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: newNotes
        })
      if (!error) fetchStats()
    } else {
      // Update existing
      const { error } = await supabase
        .from('batch_targets')
        .update({
          batch_name: newBatchName,
          target_seat_lock: newTarget,
          start_date: newStartDate,
          closing_date: newEndDate,
          notes: newNotes,
          updated_at: new Date().toISOString()
        })
        .eq('id', batchTarget.id)
      if (!error) fetchStats()
    }
    setIsEditingTarget(false)
  }

  const funnelPhases = [
    {
      title: 'Acquisition (Lead Masuk)',
      color: '#a78bfa',
      stages: [
        { label: 'Total Leads', value: stats.totalLeads, color: '#a78bfa' },
        { label: 'New Leads', value: stats.newLeads, color: '#60a5fa' },
        { label: 'Pitching', value: stats.pitching, color: '#8b5cf6' },
        { label: 'Interested Leads', value: stats.interestedLeads, color: '#34d399' },
        { label: 'Not Interested / Lost', value: stats.notInterested, color: '#f87171' },
        { label: 'Not Eligible', value: stats.notEligible, color: '#94a3b8' },
      ]
    },
    {
      title: 'Proses Pemetaan',
      color: '#f59e0b',
      stages: [
        { label: 'Pemetaan Scheduled', value: stats.pemetaanScheduled, color: '#f59e0b' },
        { label: 'Waiting Result', value: stats.waitingResult, color: '#06b6d4' },
        { label: 'Sent Result Pemetaan', value: stats.sentResultPemetaan, color: '#10b981' },
      ]
    },
    {
      title: 'Konsultasi Expert',
      color: '#8b5cf6',
      stages: [
        { label: 'Expert Consult Scheduled', value: stats.expertScheduled, color: '#8b5cf6' },
      ]
    },
    {
      title: 'Closing & Kelas',
      color: '#10b981',
      stages: [
        { label: 'Seat Lock Offered', value: stats.seatLockOffered, color: '#f43f5e' },
        { label: 'Seat Lock Paid', value: stats.seatLockPaid, color: '#10b981' },
        { label: 'Onboarding', value: stats.onboarding, color: '#d97706' },
      ]
    }
  ]

  return (
    <>
      <Header title="Dashboard" subtitle={`Monitor progres leads dan pencapaian target CRO`} />
      
      <div className="w-full p-6 space-y-6 animate-fade-in">
        
        {/* Top Section: Revenue & Campaign Snapshot */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Revenue Cards */}
          <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Revenue Pemetaan */}
            <div className="glass-card rounded-2xl p-5 border border-border relative overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:z-30 hover:border-purple-300 hover:shadow-xl active:scale-[0.98] focus-within:z-30 cursor-pointer">
              <Link
                href="/conversions?type=pemetaan"
                aria-label="Lihat detail revenue pemetaan"
                className="absolute inset-0 z-20 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              />
              <div className="relative z-10 flex items-center justify-between mb-2 pointer-events-none">
                <span className="text-muted-foreground text-xs font-medium">Revenue Pemetaan</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <DollarSign size={15} />
                </div>
              </div>
              <div className="relative z-10 pointer-events-none">
                <p className="text-2xl font-bold text-foreground tracking-tight">
                  Rp {stats.revenuePemetaan.toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">Total pembayaran sesi pemetaan verified</p>
                <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-300 mt-2">Lihat detail</p>
              </div>
            </div>

            {/* Revenue Seat Lock */}
            <div className="glass-card rounded-2xl p-5 border border-border relative overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:z-30 hover:border-emerald-300 hover:shadow-xl active:scale-[0.98] focus-within:z-30 cursor-pointer">
              <Link
                href="/conversions?type=seat_lock"
                aria-label="Lihat detail revenue seat lock"
                className="absolute inset-0 z-20 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              />
              <div className="relative z-10 flex items-center justify-between mb-2 pointer-events-none">
                <span className="text-muted-foreground text-xs font-medium">Revenue Seat Lock</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <DollarSign size={15} />
                </div>
              </div>
              <div className="relative z-10 pointer-events-none">
                <p className="text-2xl font-bold text-foreground tracking-tight">
                  Rp {stats.revenueSeatLock.toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">Total pembayaran seat lock verified</p>
                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-300 mt-2">Lihat detail</p>
              </div>
            </div>

            {/* Combined Revenue */}
            <div className="glass-card rounded-2xl p-5 border border-purple-200 dark:border-purple-500/10 relative overflow-hidden flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:z-30 hover:border-purple-300 hover:shadow-xl active:scale-[0.98] focus-within:z-30 cursor-pointer" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.05), rgba(168,85,247,0.02))' }}>
              <Link
                href="/conversions"
                aria-label="Lihat semua detail revenue"
                className="absolute inset-0 z-20 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              />
              <div className="relative z-10 flex items-center justify-between mb-2 pointer-events-none">
                <span className="text-purple-600 dark:text-purple-300 text-xs font-bold">Revenue Combined</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-300">
                  <TrendingUp size={15} />
                </div>
              </div>
              <div className="relative z-10 pointer-events-none">
                <p className="text-2xl font-black text-purple-600 dark:text-purple-300 tracking-tight">
                  Rp {stats.revenueCombined.toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-purple-600/60 dark:text-purple-300/40 mt-1 font-medium">Total Akumulasi Pendapatan</p>
                <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-300 mt-2">Lihat detail</p>
              </div>
            </div>

          </div>

          {/* Campaign Snapshot */}
          <div className="glass-card rounded-2xl p-5 border border-border relative overflow-hidden flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-muted-foreground text-xs font-medium">Campaign Aktif</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Users size={15} />
              </div>
            </div>

            <div>
              <p className="text-2xl font-bold text-foreground tracking-tight">
                {campaignProgress.length.toLocaleString('id-ID')}
              </p>
              <p className="text-[10px] text-muted-foreground/80 mt-1">
                Total campaign dari semua lead aktif
              </p>
              <p className="text-[10px] text-muted-foreground/70 mt-2">
                Detail campaign tampil lengkap di tabel bawah.
              </p>
            </div>
          </div>

        </div>

        {/* Grouped Funnel Summary Cards */}
        <div>
          <h2 className="text-foreground font-extrabold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Award size={16} className="text-purple-600 dark:text-purple-400" />
            Summary Pipeline Leads
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {funnelPhases.map(phase => (
              <div 
                key={phase.title} 
                className="glass-card rounded-2xl p-5 border border-border flex flex-col justify-between hover:scale-[1.02] transition-all duration-200"
              >
                <div>
                  <div className="flex items-center gap-2 border-b border-border pb-3 mb-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: phase.color }} />
                    <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">{phase.title}</h3>
                  </div>
                  
                  <div className="space-y-3">
                    {phase.stages.map(stage => (
                      <div key={stage.label} className="flex items-center justify-between text-xs py-0.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                          <span className="text-muted-foreground font-medium truncate">{stage.label}</span>
                        </div>
                        <span className="font-extrabold text-foreground bg-slate-50 dark:bg-white/[0.04] px-2 py-0.5 rounded-lg border border-border/50">
                          {stage.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Funnel Intelligence */}
        <section className="space-y-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-foreground">
                <Target size={16} className="text-blue-600 dark:text-blue-400" />
                Funnel Intelligence
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Indikator keputusan dari posisi pipeline dan handling terbaru.</p>
            </div>
            <Link href="/analytics" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
              Buka Analytics <ArrowRight size={13} />
            </Link>
          </div>

          <div className="glass-card rounded-2xl border border-border p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
              {intelligence.funnel.map((stage, index) => (
                <div key={stage.label} className="relative rounded-xl border border-border bg-slate-50/60 p-3 dark:bg-white/[0.03]">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase text-muted-foreground">{stage.label}</span>
                    {index > 0 && <span className="text-[10px] font-black text-primary">{stage.conversion}%</span>}
                  </div>
                  <p className="text-xl font-black text-foreground">{stage.reached}</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(stage.conversion, stage.reached > 0 ? 3 : 0)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-muted-foreground">Persentase menunjukkan estimasi lead yang telah mencapai tahap dibanding total lead masuk.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-red-200 bg-red-50/70 p-4 dark:border-red-500/20 dark:bg-red-500/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-red-700 dark:text-red-300">Drop-off Terbesar</span>
                <AlertTriangle size={16} className="text-red-500" />
              </div>
              <p className="mt-3 text-lg font-black text-foreground">{intelligence.biggestDrop?.count || 0} lead</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {intelligence.biggestDrop ? `${intelligence.biggestDrop.from} ke ${intelligence.biggestDrop.to} (${intelligence.biggestDrop.pct}%)` : 'Belum ada data funnel'}
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/20 dark:bg-amber-500/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-amber-700 dark:text-amber-300">Kendala Dominan</span>
                <Flame size={16} className="text-amber-500" />
              </div>
              <p className="mt-3 truncate text-lg font-black text-foreground">{intelligence.topObjection}</p>
              <p className="mt-1 text-xs text-muted-foreground">{intelligence.topObjectionCount} catatan chat</p>
            </div>

            <Link href="/expert-queue" className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 transition-colors hover:bg-violet-100/70 dark:border-violet-500/20 dark:bg-violet-500/[0.06] dark:hover:bg-violet-500/10">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-violet-700 dark:text-violet-300">Perlu Dibantu</span>
                <Users size={16} className="text-violet-500" />
              </div>
              <p className="mt-3 text-lg font-black text-foreground">{intelligence.expertPending}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">Buka Butuh Dibantu <ArrowRight size={12} /></p>
            </Link>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-500/20 dark:bg-blue-500/[0.06]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-blue-700 dark:text-blue-300">Bisa Berbayar</span>
                <BriefcaseBusiness size={16} className="text-blue-500" />
              </div>
              <p className="mt-3 text-lg font-black text-foreground">{intelligence.potentialPaidPending}</p>
              <p className="mt-1 text-xs text-muted-foreground">Peluang layanan yang belum punya hasil</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
            <div className="glass-card rounded-2xl border border-border p-5 xl:col-span-3">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-extrabold uppercase text-foreground">Kualitas Campaign</h3>
                  <p className="mt-1 text-[10px] text-muted-foreground">Diurutkan dari konversi seat lock tertinggi.</p>
                </div>
                <span className="text-[10px] text-muted-foreground">Top 5</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase text-muted-foreground">
                      <th className="pb-2 font-extrabold">Campaign</th>
                      <th className="pb-2 text-right font-extrabold">Lead</th>
                      <th className="pb-2 text-right font-extrabold">Qualified</th>
                      <th className="pb-2 text-right font-extrabold">Seat Lock</th>
                      <th className="pb-2 text-right font-extrabold">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intelligence.campaigns.map(campaign => (
                      <tr key={campaign.name} className="border-b border-border/60 last:border-b-0">
                        <td className="max-w-56 truncate py-3 font-bold text-foreground">{campaign.name}</td>
                        <td className="py-3 text-right text-muted-foreground">{campaign.total}</td>
                        <td className="py-3 text-right text-muted-foreground">{campaign.qualified}</td>
                        <td className="py-3 text-right text-muted-foreground">{campaign.seatLocks}</td>
                        <td className="py-3 text-right font-black text-primary">{campaign.conversion}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-border p-5 xl:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase text-foreground">
                    <Clock3 size={14} className="text-orange-500" /> Lead Belum Disentuh
                  </h3>
                  <p className="mt-1 text-[10px] text-muted-foreground">Tidak diperbarui minimal 3 hari.</p>
                </div>
                <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-black text-orange-700 dark:bg-orange-500/15 dark:text-orange-300">{intelligence.staleLeads}</span>
              </div>
              <div className="space-y-2">
                {intelligence.stalePreview.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">Semua lead aktif masih terpantau.</p>
                ) : intelligence.stalePreview.map(lead => (
                  <Link key={lead.id} href={`/leads/${lead.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04]">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">{lead.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">{lead.status}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-extrabold text-orange-600 dark:text-orange-300">{lead.days} hari</span>
                  </Link>
                ))}
              </div>
              {intelligence.staleLeads > intelligence.stalePreview.length && (
                <Link href="/leads" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                  Lihat semua lead <ArrowRight size={12} />
                </Link>
              )}
            </div>
          </div>
        </section>

      </div>

      {/* Edit Target Modal */}
      {isEditingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground mb-4">Edit Target Progres Batch</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Nama Batch</label>
                <input
                  type="text"
                  value={newBatchName}
                  onChange={(e) => setNewBatchName(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Target Seat Lock</label>
                <input
                  type="number"
                  value={newTarget}
                  onChange={(e) => setNewTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Tanggal Mulai</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Tanggal Selesai</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Catatan Tambahan</label>
                <textarea
                  placeholder="Catatan tambahan target..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl h-20 focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              <button
                onClick={() => setIsEditingTarget(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSaveTarget}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white hover:glow-purple transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
              >
                Simpan Target
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

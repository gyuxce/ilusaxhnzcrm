'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Users,
  Flame,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Award,
  Calendar,
  Zap,
  RefreshCw,
  Percent,
  CheckCircle2,
  BookOpen,
  Plus
} from 'lucide-react'
import { Header } from '@/components/layout/header'

interface DashboardStats {
  totalLeads: number
  newLeads: number
  pitching: number
  interestedLeads: number
  notInterested: number
  notEligible: number
  pemetaanScheduled: number
  waitingResult: number
  expertScheduled: number
  seatLockOffered: number
  seatLockPaid: number
  onboarding: number
  
  revenuePemetaan: number
  revenueSeatLock: number
  revenueCombined: number
}

interface BatchTarget {
  id: string
  batch_name: string
  target_seat_lock: number
  start_date: string
  closing_date: string
  notes: string | null
}

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
    expertScheduled: 0,
    seatLockOffered: 0,
    seatLockPaid: 0,
    onboarding: 0,
    revenuePemetaan: 0,
    revenueSeatLock: 0,
    revenueCombined: 0
  })
  
  const [batchTarget, setBatchTarget] = useState<BatchTarget | null>(null)
  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('cro')
  const [recentLeads, setRecentLeads] = useState<any[]>([])
  const [fuTodayCount, setFuTodayCount] = useState(0)
  
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
      .select('current_status, source_campaign')

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
    setRecentLeads(recent || [])

    // 6. Count today's follow-ups
    const today = new Date().toISOString().split('T')[0]
    const { count: fuCount } = await supabase
      .from('follow_ups')
      .select('*', { count: 'exact', head: true })
      .eq('is_done', false)
      .lte('scheduled_date', today)
    setFuTodayCount(fuCount || 0)

    const latestTarget = targets && targets.length > 0 ? targets[0] : null
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
      'Expert Consultation Scheduled': 0,
      'Seat Lock Offered': 0,
      'Seat Lock Paid': 0,
      'Onboarding': 0,
    }

    if (leads) {
      total = leads.length
      leads.forEach((lead: any) => {
        const s = lead.current_status
        sc[s] = (sc[s] || 0) + 1
      })
    }

    const targetByName = new Map<string, BatchTarget>()
    ;(targets || []).forEach((target: BatchTarget) => {
      targetByName.set(target.batch_name, target)
    })

    const campaignMap = new Map<string, { totalLeads: number; seatLocks: number }>()
    ;(leads || []).forEach((lead: any) => {
      const campaignName = lead.source_campaign?.trim() || 'No Campaign'
      const current = campaignMap.get(campaignName) || { totalLeads: 0, seatLocks: 0 }
      current.totalLeads += 1

      if (['Seat Lock Paid', 'Onboarding', 'Class Started'].includes(lead.current_status)) {
        current.seatLocks += 1
      }

      campaignMap.set(campaignName, current)
    })

    ;(targets || []).forEach((target: BatchTarget) => {
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

    // Calculate revenue
    let revPemetaan = 0
    let revSeatLock = 0
    if (payments) {
      payments.forEach((p: any) => {
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
      
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
        
        {/* Top Section: Revenue & Campaign Snapshot */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Revenue Cards */}
          <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Revenue Pemetaan */}
            <div className="glass-card rounded-2xl p-5 border border-border relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-xs font-medium">Revenue Pemetaan</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <DollarSign size={15} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tracking-tight">
                  Rp {stats.revenuePemetaan.toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">Total pembayaran sesi pemetaan verified</p>
              </div>
            </div>

            {/* Revenue Seat Lock */}
            <div className="glass-card rounded-2xl p-5 border border-border relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-xs font-medium">Revenue Seat Lock</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <DollarSign size={15} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground tracking-tight">
                  Rp {stats.revenueSeatLock.toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">Total pembayaran seat lock verified</p>
              </div>
            </div>

            {/* Combined Revenue */}
            <div className="glass-card rounded-2xl p-5 border border-purple-200 dark:border-purple-500/10 relative overflow-hidden flex flex-col justify-between" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.05), rgba(168,85,247,0.02))' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-600 dark:text-purple-300 text-xs font-bold">Revenue Combined</span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-300">
                  <TrendingUp size={15} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-purple-600 dark:text-purple-300 tracking-tight">
                  Rp {stats.revenueCombined.toLocaleString('id-ID')}
                </p>
                <p className="text-[10px] text-purple-600/60 dark:text-purple-300/40 mt-1 font-medium">Total Akumulasi Pendapatan</p>
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

        {/* Campaign Progress Table */}
        <div className="glass-card rounded-2xl p-5 border border-border">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-foreground font-extrabold text-sm uppercase tracking-wider">
                Semua Campaign
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Ringkasan campaign dari semua lead yang masuk.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {campaignProgress.length} campaign
            </p>
          </div>

          {campaignProgress.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">Belum ada campaign.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="py-3 pr-4 font-bold">Campaign</th>
                    <th className="py-3 pr-4 font-bold text-right">Total Lead</th>
                    <th className="py-3 pr-4 font-bold text-right">Seat Lock</th>
                    <th className="py-3 pr-4 font-bold text-right">Target</th>
                    <th className="py-3 pr-4 font-bold text-right">Progress</th>
                    <th className="py-3 font-bold">Target Source</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignProgress.map((campaign) => (
                    <tr key={campaign.name} className="border-b border-border/70 last:border-b-0">
                      <td className="py-3 pr-4 font-bold text-foreground">{campaign.name}</td>
                      <td className="py-3 pr-4 text-right text-muted-foreground">{campaign.totalLeads}</td>
                      <td className="py-3 pr-4 text-right text-muted-foreground">{campaign.seatLocks}</td>
                      <td className="py-3 pr-4 text-right text-muted-foreground">{campaign.targetSeatLock}</td>
                      <td className="py-3 pr-4 text-right font-extrabold text-purple-600 dark:text-purple-400">
                        {campaign.progressPct}%
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {campaign.hasManualTarget ? 'Manual dari Settings' : 'Otomatis dari total lead'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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

        {/* Bottom: Activity Feed + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Recent Leads Activity Feed */}
          <div className="glass-card rounded-2xl p-5 border border-border">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Users size={16} className="text-blue-600 dark:text-blue-400" />
              Lead Terbaru Masuk
            </h2>
            <div className="space-y-2">
              {recentLeads.length === 0 ? (
                <p className="text-muted-foreground/50 text-xs text-center py-6">Belum ada data lead.</p>
              ) : (
                recentLeads.map((lead: any) => (
                  <a key={lead.id} href={`/leads/${lead.id}`} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 text-[10px] font-extrabold" style={{ background: 'hsl(250,84%,60%,0.15)', color: '#a78bfa' }}>
                      {lead.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate group-hover:text-purple-300 transition-colors">{lead.full_name}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{lead.source_campaign}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[9px] font-bold" style={{ color: lead.lead_type === 'outbound' ? '#3b82f6' : '#10b981' }}>
                        {lead.lead_type === 'outbound' ? 'OUT' : 'IN'}
                      </p>
                      <p className="text-[8px] text-muted-foreground/60">
                        {new Date(lead.lead_entry_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-card rounded-2xl p-5 border border-border">
            <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap size={16} className="text-purple-600 dark:text-purple-400" />
              Aksi Cepat
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: '/leads/new', label: 'Tambah Lead Baru', icon: <Plus size={16} />, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
                { href: '/needs-action', label: 'Needs Action', icon: <CheckCircle2 size={16} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                { href: '/follow-ups', label: `FU Hari Ini (${fuTodayCount})`, icon: <Calendar size={16} />, color: fuTodayCount > 0 ? '#f97316' : '#64748b', bg: fuTodayCount > 0 ? 'rgba(249,115,22,0.1)' : 'rgba(100,116,139,0.08)' },
                { href: '/pipeline', label: 'Pipeline Board', icon: <BookOpen size={16} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
              ].map((action, idx) => (
                <a
                  key={idx}
                  href={action.href}
                  className="flex items-center gap-3 p-4 rounded-xl transition-all duration-150 hover:scale-[1.02]"
                  style={{ background: action.bg, border: `1px solid ${action.color}20` }}
                >
                  <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-foreground flex-shrink-0">
                    {action.icon}
                  </div>
                  <span className="text-xs font-bold text-foreground">{action.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

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

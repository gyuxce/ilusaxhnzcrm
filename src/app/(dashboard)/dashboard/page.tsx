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
  Edit2,
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
  interestedLeads: number
  notInterested: number
  pemetaanPaid: number
  pemetaanDone: number
  waitingResult: number
  resultReady: number
  expertScheduled: number
  expertDone: number
  seatLockOffered: number
  seatLockPaid: number
  onboarding: number
  classStarted: number
  
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

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    newLeads: 0,
    interestedLeads: 0,
    notInterested: 0,
    pemetaanPaid: 0,
    pemetaanDone: 0,
    waitingResult: 0,
    resultReady: 0,
    expertScheduled: 0,
    expertDone: 0,
    seatLockOffered: 0,
    seatLockPaid: 0,
    onboarding: 0,
    classStarted: 0,
    revenuePemetaan: 0,
    revenueSeatLock: 0,
    revenueCombined: 0
  })
  
  const [batchTarget, setBatchTarget] = useState<BatchTarget | null>(null)
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
      .select('current_status')

    // 3. Fetch verified payments for revenue
    const { data: payments } = await supabase
      .from('payments')
      .select('payment_type, amount')
      .eq('verification_status', 'verified')

    // 4. Fetch latest batch target
    const { data: targets } = await supabase
      .from('batch_targets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

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
    let sc: Record<string, number> = {
      'New Lead': 0,
      'Follow Up': 0,
      'Pitching': 0,
      'Interested': 0,
      'Not Interested': 0,
      'Payment Pemetaan Pending': 0,
      'Payment Pemetaan Paid': 0,
      'Pemetaan Form Submitted': 0,
      'Pemetaan Scheduled': 0,
      'Pemetaan Done': 0,
      'Waiting Result': 0,
      'Result Ready': 0,
      'Expert Consultation Scheduled': 0,
      'Expert Consultation Done': 0,
      'Seat Lock Offered': 0,
      'Seat Lock Paid': 0,
      'Onboarding': 0,
      'Class Started': 0
    }

    if (leads) {
      total = leads.length
      leads.forEach((lead: any) => {
        const s = lead.current_status
        sc[s] = (sc[s] || 0) + 1
      })
    }

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
      interestedLeads: sc['Interested'] || 0,
      notInterested: (sc['Not Interested'] || 0) + (sc['Failed Closing'] || 0) + (sc['Not Qualified'] || 0) + (sc['No Response'] || 0) + (sc['Need Follow Up Later'] || 0),
      pemetaanPaid: sc['Payment Pemetaan Paid'] || 0,
      pemetaanDone: sc['Pemetaan Done'] || 0,
      waitingResult: sc['Waiting Result'] || 0,
      resultReady: sc['Result Ready'] || 0,
      expertScheduled: sc['Expert Consultation Scheduled'] || 0,
      expertDone: sc['Expert Consultation Done'] || 0,
      seatLockOffered: sc['Seat Lock Offered'] || 0,
      seatLockPaid: sc['Seat Lock Paid'] || 0,
      onboarding: sc['Onboarding'] || 0,
      classStarted: sc['Class Started'] || 0,
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

  // Count leads that represent seat lock conversion
  // These are leads that have actually paid seat lock or onwards (Onboarding, Class Started)
  const currentSeatLocks = stats.seatLockPaid + stats.onboarding + stats.classStarted
  const targetVal = batchTarget?.target_seat_lock || 1
  const progressPct = Math.min(Math.round((currentSeatLocks / targetVal) * 100), 100)

  const summaryCards = [
    { label: 'Total Leads', value: stats.totalLeads, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    { label: 'New Leads', value: stats.newLeads, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    { label: 'Interested Leads', value: stats.interestedLeads, color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
    { label: 'Not Interested / Lost', value: stats.notInterested, color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
    { label: 'Pemetaan Paid', value: stats.pemetaanPaid, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { label: 'Pemetaan Done', value: stats.pemetaanDone, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Waiting Result', value: stats.waitingResult, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    { label: 'Result Ready', value: stats.resultReady, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    { label: 'Expert Consult Scheduled', value: stats.expertScheduled, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { label: 'Expert Consult Done', value: stats.expertDone, color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
    { label: 'Seat Lock Offered', value: stats.seatLockOffered, color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
    { label: 'Seat Lock Paid', value: stats.seatLockPaid, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { label: 'Onboarding', value: stats.onboarding, color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
    { label: 'Class Started', value: stats.classStarted, color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
  ]

  return (
    <>
      <Header title="Dashboard" subtitle={`Monitor progres leads dan pencapaian target CRO`} />
      
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
        
        {/* Top Section: Revenue & Batch Target Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Revenue Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            
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

          {/* Batch Target Progress Bar */}
          <div className="glass-card rounded-2xl p-5 border border-border flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Target Progres</span>
                <h3 className="text-sm font-extrabold text-foreground">{batchTarget?.batch_name || 'Batch 1'}</h3>
              </div>
              {(userRole === 'admin' || userRole === 'owner') && (
                <button
                  onClick={() => setIsEditingTarget(true)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/5 transition-all border border-border bg-card/50"
                >
                  <Edit2 size={13} />
                </button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end text-xs">
                <span className="text-muted-foreground">Seat Lock: {currentSeatLocks} / {targetVal}</span>
                <span className="font-extrabold text-purple-600 dark:text-purple-400">{progressPct}%</span>
              </div>
              
              <div className="h-2.5 rounded-full overflow-hidden w-full bg-slate-100 dark:bg-slate-800">
                <div 
                  className="h-full rounded-full transition-all duration-700 glow-purple" 
                  style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
                />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground/75 mt-3 italic">
              {batchTarget?.notes || 'Tidak ada catatan tambahan untuk batch ini.'}
            </p>
          </div>

        </div>

        {/* 14 Summary Cards Grid */}
        <div>
          <h2 className="text-foreground font-extrabold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Award size={16} className="text-purple-600 dark:text-purple-400" />
            Summary Pipeline Leads
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {summaryCards.map(card => (
              <div 
                key={card.label} 
                className="glass-card rounded-2xl p-4 border border-border flex flex-col justify-between hover:scale-[1.03] transition-transform duration-200"
              >
                <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-wide truncate">{card.label}</span>
                <div className="flex items-baseline justify-between mt-3">
                  <span className="text-2xl font-black text-foreground">{card.value}</span>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: card.bg }}>
                    <div className="w-2 h-2 rounded-full" style={{ background: card.color }} />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
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

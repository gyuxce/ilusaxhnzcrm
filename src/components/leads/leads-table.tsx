'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, Filter, ExternalLink, MessageCircle,
  ChevronUp, ChevronDown, Copy, Calendar, RefreshCw,
  ChevronLeft, ChevronRight,
  Edit, Trash2, CreditCard, ClipboardList, UserCheck, Lock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lead } from '@/lib/supabase/types'
import { WhatsAppModal } from './WhatsAppModal'
import { createClient } from '@/lib/supabase/client'

type LeadWithRelations = Lead & {
  users?: { id: string; name: string } | null
  payments?: any[]
  pemetaan?: any[]
  expert_consultations?: any[]
}

interface LeadsTableProps {
  initialLeads: LeadWithRelations[]
  pics: { id: string; name: string }[]
}

const renderMilestones = (lead: LeadWithRelations) => {
  const pemetaanPayment = lead.payments?.find(p => p.payment_type === 'pemetaan')
  const seatLockPayment = lead.payments?.find(p => p.payment_type === 'seat_lock')
  const pemRecord = lead.pemetaan && lead.pemetaan.length > 0 ? lead.pemetaan[0] : null
  const expRecord = lead.expert_consultations && lead.expert_consultations.length > 0 ? lead.expert_consultations[0] : null

  // Step 1: Payment Pemetaan
  let step1: 'success' | 'warning' | 'empty' = 'empty'
  let step1Text = 'Payment Pemetaan: Belum Bayar'
  if (pemetaanPayment) {
    if (pemetaanPayment.verification_status === 'verified') {
      step1 = 'success'
      step1Text = 'Payment Pemetaan: Lunas & Terverifikasi'
    } else if (pemetaanPayment.verification_status === 'pending') {
      step1 = 'warning'
      step1Text = 'Payment Pemetaan: Menunggu Verifikasi'
    } else {
      step1 = 'empty'
      step1Text = 'Payment Pemetaan: Ditolak'
    }
  }

  // Step 2: Pemetaan Session
  let step2: 'success' | 'warning' | 'empty' = 'empty'
  let step2Text = 'Sesi Pemetaan: Belum Dimulai'
  if (pemRecord) {
    if (pemRecord.result_status === 'ready') {
      step2 = 'success'
      step2Text = 'Sesi Pemetaan: Hasil Siap (Ready)'
    } else if (pemRecord.scheduled_at) {
      step2 = 'warning'
      const date = new Date(pemRecord.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      step2Text = `Sesi Pemetaan: Terjadwal (${date})`
    } else if (pemRecord.form_status === 'submitted') {
      step2 = 'warning'
      step2Text = 'Sesi Pemetaan: Form Diisi'
    } else if (pemRecord.form_status === 'sent') {
      step2 = 'warning'
      step2Text = 'Sesi Pemetaan: Form Dikirim'
    }
  }

  // Step 3: Expert Consultation
  let step3: 'success' | 'warning' | 'empty' = 'empty'
  let step3Text = 'Konsultasi Expert: Belum Terjadwal'
  if (expRecord) {
    if (expRecord.consultation_result) {
      step3 = 'success'
      step3Text = `Konsultasi Expert: Selesai (${expRecord.consultation_result})`
    } else if (expRecord.scheduled_at) {
      step3 = 'warning'
      const date = new Date(expRecord.scheduled_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      step3Text = `Konsultasi Expert: Terjadwal (${date})`
    }
  }

  // Step 4: Seat Lock Payment
  let step4: 'success' | 'warning' | 'empty' = 'empty'
  let step4Text = 'Seat Lock: Belum Bayar'
  if (seatLockPayment) {
    if (seatLockPayment.verification_status === 'verified') {
      step4 = 'success'
      step4Text = 'Seat Lock: Lunas (Verified)'
    } else if (seatLockPayment.verification_status === 'pending') {
      step4 = 'warning'
      step4Text = 'Seat Lock: Menunggu Verifikasi'
    }
  }

  const steps = [
    { id: 1, label: 'Payment', icon: CreditCard, status: step1, tooltip: step1Text, colorClass: 'emerald' },
    { id: 2, label: 'Pemetaan', icon: ClipboardList, status: step2, tooltip: step2Text, colorClass: 'blue' },
    { id: 3, label: 'Expert', icon: UserCheck, status: step3, tooltip: step3Text, colorClass: 'purple' },
    { id: 4, label: 'Seat Lock', icon: Lock, status: step4, tooltip: step4Text, colorClass: 'red' }
  ]

  return (
    <div className="flex items-center gap-1.5 py-1">
      {steps.map((step, idx) => {
        const IconComponent = step.icon
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 relative group/step cursor-help select-none",
                // Emerald
                step.colorClass === 'emerald' && step.status === 'success' && "bg-emerald-500 border-emerald-600 text-white shadow-xs",
                step.colorClass === 'emerald' && step.status === 'warning' && "bg-emerald-500/10 border-emerald-500 border-dashed text-emerald-600 dark:text-emerald-400",
                step.colorClass === 'emerald' && step.status === 'empty' && "bg-emerald-500/5 border-emerald-500/40 dark:border-emerald-500/25 text-emerald-500/80 dark:text-emerald-400/60",
                
                // Blue
                step.colorClass === 'blue' && step.status === 'success' && "bg-blue-500 border-blue-600 text-white shadow-xs",
                step.colorClass === 'blue' && step.status === 'warning' && "bg-blue-500/10 border-blue-500 border-dashed text-blue-600 dark:text-blue-400",
                step.colorClass === 'blue' && step.status === 'empty' && "bg-blue-500/5 border-blue-500/40 dark:border-blue-500/25 text-blue-500/80 dark:text-blue-400/60",
                
                // Purple
                step.colorClass === 'purple' && step.status === 'success' && "bg-purple-500 border-purple-600 text-white shadow-xs",
                step.colorClass === 'purple' && step.status === 'warning' && "bg-purple-500/10 border-purple-500 border-dashed text-purple-600 dark:text-purple-400",
                step.colorClass === 'purple' && step.status === 'empty' && "bg-purple-500/5 border-purple-500/40 dark:border-purple-500/25 text-purple-500/80 dark:text-purple-400/60",
                
                // Red
                step.colorClass === 'red' && step.status === 'success' && "bg-red-500 border-red-600 text-white shadow-xs",
                step.colorClass === 'red' && step.status === 'warning' && "bg-red-500/10 border-red-500 border-dashed text-red-600 dark:text-red-400",
                step.colorClass === 'red' && step.status === 'empty' && "bg-red-500/5 border-red-500/40 dark:border-red-500/25 text-red-500/80 dark:text-red-400/60"
              )}
            >
              <IconComponent size={11} />
              {/* Custom Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/step:block z-50 bg-slate-950 border border-white/10 text-white text-[10px] px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-2xl pointer-events-none">
                {step.tooltip}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "w-3 h-0.5 transition-all duration-300",
                  steps[idx + 1].status !== 'empty' ? "bg-slate-400 dark:bg-slate-600" : "bg-slate-200 dark:bg-slate-800"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}


export function LeadsTable({ initialLeads, pics }: LeadsTableProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<{ id: string; name: string } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const promptDelete = (id: string, name: string) => {
    setLeadToDelete({ id, name })
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!leadToDelete) return
    
    setDeletingId(leadToDelete.id)
    const supabase = createClient()
    const { error } = await supabase.from('leads').delete().eq('id', leadToDelete.id)
    setDeletingId(null)
    setDeleteModalOpen(false)
    setLeadToDelete(null)

    if (error) {
      alert('Gagal menghapus lead: ' + error.message)
    } else {
      router.refresh()
    }
  }

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPic, setFilterPic] = useState('all')
  const [filterCampaign, setFilterCampaign] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  const [filterSeatLock, setFilterSeatLock] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  const [sortField, setSortField] = useState<'full_name' | 'lead_entry_date' | 'current_status'>('lead_entry_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [waModalOpen, setWaModalOpen] = useState(false)
  const [activeLead, setActiveLead] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  // Get unique campaigns for filter dropdown
  const campaignsList = useMemo(() => {
    const set = new Set<string>()
    initialLeads.forEach(l => {
      if (l.source_campaign) set.add(l.source_campaign)
    })
    return Array.from(set)
  }, [initialLeads])

  // Get unique statuses for filter dropdown
  const statusesList = useMemo(() => {
    const set = new Set<string>()
    initialLeads.forEach(l => {
      if (l.current_status) set.add(l.current_status)
    })
    return Array.from(set)
  }, [initialLeads])

  const filtered = useMemo(() => {
    let data = [...initialLeads]

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(l =>
        l.full_name.toLowerCase().includes(q) ||
        l.whatsapp_number.includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.notes?.toLowerCase().includes(q)
      )
    }

    if (filterStatus !== 'all') {
      data = data.filter(l => l.current_status === filterStatus)
    }

    if (filterPic !== 'all') {
      data = data.filter(l => l.assigned_cro_id === filterPic)
    }

    if (filterCampaign !== 'all') {
      data = data.filter(l => l.source_campaign === filterCampaign)
    }

    if (filterPayment !== 'all') {
      data = data.filter(l => {
        const pm = l.payments?.find(p => p.payment_type === 'pemetaan')
        const status = pm ? pm.verification_status : 'pending_payment'
        return status === filterPayment
      })
    }

    if (filterSeatLock !== 'all') {
      data = data.filter(l => {
        const pm = l.payments?.find(p => p.payment_type === 'seat_lock')
        const status = pm ? pm.verification_status : 'not_paid'
        return status === filterSeatLock
      })
    }

    if (startDate) {
      data = data.filter(l => new Date(l.lead_entry_date) >= new Date(startDate))
    }

    if (endDate) {
      // Add 1 day to end date to make it inclusive
      const end = new Date(endDate)
      end.setDate(end.getDate() + 1)
      data = data.filter(l => new Date(l.lead_entry_date) <= end)
    }

    // Sorting
    data.sort((a, b) => {
      let av = sortField === 'lead_entry_date' ? a.lead_entry_date : sortField === 'full_name' ? a.full_name : a.current_status
      let bv = sortField === 'lead_entry_date' ? b.lead_entry_date : sortField === 'full_name' ? b.full_name : b.current_status
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

    return data
  }, [initialLeads, search, filterStatus, filterPic, filterCampaign, filterPayment, filterSeatLock, startDate, endDate, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStartIndex = filtered.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const pageEndIndex = Math.min(safeCurrentPage * pageSize, filtered.length)
  const paginatedLeads = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safeCurrentPage])

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) return <ChevronUp size={12} className="text-white/20" />
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="text-purple-400" />
      : <ChevronDown size={12} className="text-purple-400" />
  }

  // Format Helper
  const formatCellDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {/* Top bar info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ditemukan <span className="text-foreground font-bold">{filtered.length}</span> dari {initialLeads.length} leads
          {filtered.length > 0 && (
            <span className="ml-2 text-xs">
              Menampilkan {pageStartIndex}-{pageEndIndex}
            </span>
          )}
        </p>
        <Link
          href="/leads/new"
          className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:glow-purple"
          style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
        >
          + Tambah Lead
        </Link>
      </div>

      {/* Search & Filter Component */}
      <div className="glass-card rounded-2xl p-4 space-y-4 border border-border">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, WhatsApp, email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs text-foreground placeholder-muted-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer',
              showFilters
                ? 'text-purple-600 dark:text-purple-400 bg-purple-50/70 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-card border-border hover:bg-slate-50 dark:hover:bg-white/5'
            )}
          >
            <Filter size={14} />
            Filter Lanjutan
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
            {/* Status */}
            <div>
              <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Status Pipeline</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="all">Semua Status</option>
                {statusesList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* PIC */}
            <div>
              <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">PIC CRO</label>
              <select
                value={filterPic}
                onChange={e => setFilterPic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="all">Semua PIC</option>
                {pics.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Campaign Source */}
            <div>
              <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Source Campaign</label>
              <select
                value={filterCampaign}
                onChange={e => setFilterCampaign(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="all">Semua Campaign</option>
                {campaignsList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Status Pembayaran</label>
              <select
                value={filterPayment}
                onChange={e => setFilterPayment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="all">Semua Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="pending_payment">Belum Bayar</option>
              </select>
            </div>

            {/* Seat Lock Status */}
            <div>
              <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Status Seat Lock</label>
              <select
                value={filterSeatLock}
                onChange={e => setFilterSeatLock(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
              >
                <option value="all">Semua Status</option>
                <option value="verified">Paid / Verified</option>
                <option value="pending">Pending Verification</option>
                <option value="not_paid">Belum Seat Lock</option>
              </select>
            </div>

            {/* Date Range Start */}
            <div>
              <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Mulai Tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            {/* Date Range End */}
            <div>
              <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Hingga Tanggal</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table Data */}
      <div className="glass-card rounded-2xl overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border bg-slate-50/50 dark:bg-white/[0.01]">
                {[
                  { label: 'Nama & Campaign', field: 'full_name' as const },
                  { label: 'WhatsApp', field: null },
                  { label: 'Tanggal Masuk', field: 'lead_entry_date' as const },
                  { label: 'PIC CRO', field: null },
                  { label: 'Status Pipeline', field: 'current_status' as const },
                  { label: 'Progress Milestone', field: null },
                  { label: 'Aksi', field: null }
                ].map(col => (
                  <th
                    key={col.label}
                    className={cn(
                      'px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap',
                      col.field && 'cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none'
                    )}
                    onClick={() => col.field && toggleSort(col.field)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.field && <SortIcon field={col.field} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground/40 text-sm">
                    Tidak ada data leads yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map(lead => {
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors group">
                      {/* Name & Campaign */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col">
                          <Link href={`/leads/${lead.id}`} className="font-bold text-foreground hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                            {lead.full_name}
                          </Link>
                          <span className="text-[10px] text-muted-foreground mt-0.5">{lead.source_campaign || 'No Campaign'}</span>
                        </div>
                      </td>

                      {/* WhatsApp */}
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {lead.whatsapp_number}
                      </td>

                      {/* Tanggal Masuk */}
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatCellDate(lead.lead_entry_date)}
                      </td>

                      {/* PIC CRO */}
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {lead.users?.name || '-'}
                      </td>

                      {/* Status Pipeline */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full font-semibold bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30">
                          {lead.current_status}
                        </span>
                      </td>

                      {/* Progress Milestone */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {renderMilestones(lead)}
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setActiveLead(lead)
                              setWaModalOpen(true)
                            }}
                            className="p-1 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                            title="Kirim Pesan WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </button>
                          <Link
                            href={`/leads/${lead.id}`}
                            className="p-1 rounded-lg text-purple-600 hover:bg-purple-500/10 transition-colors"
                            title="Lihat Detail"
                          >
                            <ExternalLink size={14} />
                          </Link>
                          <Link
                            href={`/leads/${lead.id}/edit`}
                            className="p-1 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors"
                            title="Edit Lead"
                          >
                            <Edit size={14} />
                          </Link>
                          <button
                            onClick={() => promptDelete(lead.id, lead.full_name)}
                            disabled={deletingId === lead.id}
                            className="p-1 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                            title="Hapus Lead"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > pageSize && (
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Halaman <span className="font-bold text-foreground">{safeCurrentPage}</span> dari {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(page => Math.max(1, page - 1))}
                disabled={safeCurrentPage <= 1}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/5"
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-foreground transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/5"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {activeLead && (
        <WhatsAppModal
          isOpen={waModalOpen}
          onClose={() => {
            setWaModalOpen(false)
            setActiveLead(null)
          }}
          leadName={activeLead.full_name}
          leadPhone={activeLead.whatsapp_number}
        />
      )}

      {/* Custom Delete Confirmation Modal (Rendered at Body level to bypass transformed containers) */}
      {mounted && deleteModalOpen && leadToDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-scale-in">
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 bg-card border border-border shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3 text-red-500">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Hapus Lead</h3>
                <p className="text-[10px] text-muted-foreground">Tindakan ini tidak bisa dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus data lead <span className="font-bold text-foreground">"{leadToDelete.name}"</span>? Semua data pembayaran, pemetaan, dan konsultasi expert yang berkaitan akan terhapus permanen dari sistem.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setDeleteModalOpen(false)
                  setLeadToDelete(null)
                }}
                disabled={deletingId !== null}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-red-500/10 border border-red-500/20"
              >
                {deletingId !== null ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

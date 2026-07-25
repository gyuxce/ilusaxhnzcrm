'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, Filter,
  ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight,
  FileUp, Loader2, Trash2, MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Lead, PaymentRow, PemetaanRow, ExpertConsultationRow } from '@/lib/supabase/types'
import { CsvUploadModal } from './csv-upload-modal'
import { NEEDS_ACTION_STATUSES } from '@/lib/funnel-framework'
import { getStageBadgeClasses } from '@/lib/brand'
import { useCurrentRole } from '@/lib/use-current-role'

type LeadWithRelations = Lead & {
  users?: { id: string; name: string } | null
  updated_by_user?: { id: string; name: string } | null
  payments?: PaymentRow[]
  pemetaan?: PemetaanRow[]
  expert_consultations?: ExpertConsultationRow[]
}

interface LeadsTableProps {
  initialLeads: LeadWithRelations[]
  pics: { id: string; name: string; email?: string }[]
}

const paymentBadgeClass = (status: string) => {
  if (status === 'verified') return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
  if (status === 'pending') return 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
  return 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-white/5 dark:text-slate-400'
}

function paymentShort(status: string) {
  if (status === 'verified') return 'OK'
  if (status === 'pending') return 'Pending'
  return '—'
}

const renderPaymentSummary = (lead: LeadWithRelations) => {
  const pemetaanPayment = lead.payments?.find((p) => p.payment_type === 'pemetaan')
  const seatLockPayment = lead.payments?.find((p) => p.payment_type === 'seat_lock')
  const pemetaanStatus = pemetaanPayment?.verification_status || 'not_paid'
  const seatLockStatus = seatLockPayment?.verification_status || 'not_paid'

  return (
    <p className="text-[11px] text-muted-foreground whitespace-nowrap">
      <span className={cn('font-semibold', paymentBadgeClass(pemetaanStatus).includes('emerald') && 'text-emerald-700 dark:text-emerald-300')}>
        P {paymentShort(pemetaanStatus)}
      </span>
      <span className="mx-1 text-border">·</span>
      <span className={cn('font-semibold', paymentBadgeClass(seatLockStatus).includes('emerald') && 'text-emerald-700 dark:text-emerald-300')}>
        SL {paymentShort(seatLockStatus)}
      </span>
    </p>
  )
}

type QuickFilter = 'all' | 'new' | 'unassigned' | 'needs_action' | 'stale' | 'seat_lock_paid' | 'duplicate'

const quickFilterLabels: Record<QuickFilter, string> = {
  all: 'Semua',
  new: 'New Lead',
  unassigned: 'Belum Ada PIC',
  needs_action: 'Needs Action',
  stale: 'Belum Disentuh 3+ Hari',
  seat_lock_paid: 'Seat Lock Paid',
  duplicate: 'Duplikat',
}

function daysSinceLastTouch(lead: LeadWithRelations) {
  const latestDate = lead.last_contacted_date || lead.updated_at || lead.lead_entry_date
  if (!latestDate) return 0

  const start = new Date(latestDate)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

function lastTouchLabel(lead: LeadWithRelations) {
  const days = daysSinceLastTouch(lead)
  if (days === 0) return 'Hari ini'
  if (days === 1) return '1 hari lalu'
  return `${days} hari lalu`
}

function normalizePhone(value: string | null | undefined) {
  return (value || '').replace(/\D/g, '')
}


export function LeadsTable({ initialLeads, pics }: LeadsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all')

  useEffect(() => {
    const statusParam = searchParams.get('status')
    if (statusParam) {
      setFilterStatus(statusParam)
      setShowFilters(true)
    }
  }, [searchParams])
  const [filterPic, setFilterPic] = useState('all')
  const [filterCampaign, setFilterCampaign] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  const [filterSeatLock, setFilterSeatLock] = useState('all')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  const [sortField, setSortField] = useState<'full_name' | 'lead_entry_date' | 'current_status'>('lead_entry_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [csvModalOpen, setCsvModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false)
  const [bulkDeletingDuplicates, setBulkDeletingDuplicates] = useState(false)
  const [duplicateError, setDuplicateError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [openActionId, setOpenActionId] = useState<string | null>(null)
  const actionMenuRef = useRef<HTMLDivElement | null>(null)
  const { isOwnerLike } = useCurrentRole()
  const pageSize = 25

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!openActionId) return
    const onPointerDown = (event: MouseEvent) => {
      if (!actionMenuRef.current?.contains(event.target as Node)) {
        setOpenActionId(null)
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [openActionId])

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

  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, LeadWithRelations[]>()

    initialLeads.forEach(lead => {
      const phone = lead.whatsapp_normalized || normalizePhone(lead.whatsapp_number)
      if (!phone) return
      const current = groups.get(phone) || []
      current.push(lead)
      groups.set(phone, current)
    })

    return Array.from(groups.entries())
      .filter(([, leads]) => leads.length > 1)
      .map(([phone, leads]) => {
        const sorted = [...leads].sort((a, b) => {
          const aTime = new Date(a.created_at || a.lead_entry_date || 0).getTime()
          const bTime = new Date(b.created_at || b.lead_entry_date || 0).getTime()
          return aTime - bTime
        })
        return {
          phone,
          keep: sorted[0],
          duplicates: sorted.slice(1),
        }
      })
  }, [initialLeads])

  const duplicateDeleteIds = useMemo(() => {
    return duplicateGroups.flatMap(group => group.duplicates.map(lead => lead.id))
  }, [duplicateGroups])

  const duplicateLeadIds = useMemo(() => {
    return new Set(duplicateGroups.flatMap(group => [group.keep.id, ...group.duplicates.map(lead => lead.id)]))
  }, [duplicateGroups])

  const filtered = useMemo(() => {
    let data = [...initialLeads]

    if (quickFilter === 'new') {
      data = data.filter(l => l.current_status === 'New Lead')
    } else if (quickFilter === 'unassigned') {
      data = data.filter(l => !l.assigned_cro_id)
    } else if (quickFilter === 'needs_action') {
      data = data.filter(l => NEEDS_ACTION_STATUSES.includes(l.current_status))
    } else if (quickFilter === 'stale') {
      data = data.filter(l => daysSinceLastTouch(l) >= 3)
    } else if (quickFilter === 'seat_lock_paid') {
      data = data.filter(l => l.current_status === 'Seat Lock Paid' || l.current_status === 'Onboarding')
    } else if (quickFilter === 'duplicate') {
      data = data.filter(l => duplicateLeadIds.has(l.id))
    }

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(l =>
        l.full_name.toLowerCase().includes(q) ||
        l.whatsapp_number.includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.notes?.toLowerCase().includes(q) ||
        l.lead_quality?.toLowerCase().includes(q) ||
        l.lead_segment?.toLowerCase().includes(q) ||
        l.next_action?.toLowerCase().includes(q)
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
      const av = sortField === 'lead_entry_date' ? a.lead_entry_date : sortField === 'full_name' ? a.full_name : a.current_status
      const bv = sortField === 'lead_entry_date' ? b.lead_entry_date : sortField === 'full_name' ? b.full_name : b.current_status
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

    return data
  }, [initialLeads, quickFilter, duplicateLeadIds, search, filterStatus, filterPic, filterCampaign, filterPayment, filterSeatLock, startDate, endDate, sortField, sortDir])

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
      ? <ChevronUp size={12} className="text-accent" />
      : <ChevronDown size={12} className="text-accent" />
  }

  const quickCounts = useMemo(() => {
    return {
      all: initialLeads.length,
      new: initialLeads.filter(l => l.current_status === 'New Lead').length,
      unassigned: initialLeads.filter(l => !l.assigned_cro_id).length,
      needs_action: initialLeads.filter(l => NEEDS_ACTION_STATUSES.includes(l.current_status)).length,
      stale: initialLeads.filter(l => daysSinceLastTouch(l) >= 3).length,
      seat_lock_paid: initialLeads.filter(l => l.current_status === 'Seat Lock Paid' || l.current_status === 'Onboarding').length,
      duplicate: duplicateLeadIds.size,
    }
  }, [initialLeads, duplicateLeadIds])

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    window.setTimeout(() => setToast(null), 3200)
  }

  const setQuick = (value: QuickFilter) => {
    setQuickFilter(value)
    setCurrentPage(1)
  }

  const promptDelete = (id: string, name: string) => {
    setDeleteError('')
    setLeadToDelete({ id, name })
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!leadToDelete) return

    setDeletingId(leadToDelete.id)
    setDeleteError('')

    const supabase = createClient()
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadToDelete.id)

    if (error) {
      setDeleteError(error.message)
      setDeletingId(null)
      return
    }

    setDeleteModalOpen(false)
    setLeadToDelete(null)
    setDeletingId(null)
    showToast('success', 'Lead berhasil dihapus.')
    router.refresh()
  }

  const deleteDuplicateLeads = async () => {
    if (duplicateDeleteIds.length === 0) return

    setBulkDeletingDuplicates(true)
    setDuplicateError('')

    const supabase = createClient()
    const chunkSize = 500
    for (let i = 0; i < duplicateDeleteIds.length; i += chunkSize) {
      const chunk = duplicateDeleteIds.slice(i, i + chunkSize)
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', chunk)

      if (error) {
        setDuplicateError(error.message)
        setBulkDeletingDuplicates(false)
        showToast('error', 'Gagal menghapus sebagian duplikat.')
        return
      }
    }

    setBulkDeletingDuplicates(false)
    setDuplicateModalOpen(false)
    showToast('success', `${duplicateDeleteIds.length} data duplikat berhasil dihapus.`)
    router.refresh()
  }

  // Format Helper
  const formatCellDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div className={cn(
          'fixed right-5 top-5 z-50 rounded-2xl border px-4 py-3 text-sm font-bold shadow-xl',
          toast.type === 'success'
            ? 'border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'border-red-500/20 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
        )}>
          {toast.text}
        </div>
      )}

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
        <div className="flex items-center gap-2">
          {duplicateDeleteIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setDuplicateError('')
                setDuplicateModalOpen(true)
              }}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 border border-red-200 transition-all hover:bg-red-100 dark:text-red-300 dark:bg-red-500/10 dark:border-red-500/20"
            >
              <Trash2 size={14} />
              Hapus Duplikat ({duplicateDeleteIds.length})
            </button>
          )}
          <button
            onClick={() => setCsvModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-foreground bg-card border border-border transition-colors hover:bg-secondary"
          >
            <FileUp size={14} />
            Import CSV
          </button>
          <Link
            href="/leads/new"
            className="flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold text-accent-foreground bg-accent hover:opacity-90 transition-opacity"
          >
            + Tambah Lead
          </Link>
        </div>
      </div>

      {/* Search & Filter Component */}
      <div className="glass-card rounded-2xl p-4 space-y-4 border border-border">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(quickFilterLabels) as QuickFilter[]).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setQuick(key)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition-colors',
                quickFilter === key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              )}
            >
              {quickFilterLabels[key]}
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 text-[10px]',
                  quickFilter === key
                    ? 'bg-primary-foreground/15 text-primary-foreground'
                    : 'bg-muted text-foreground'
                )}
              >
                {quickCounts[key]}
              </span>
            </button>
          ))}
        </div>

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
              'flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors border cursor-pointer',
              showFilters
                ? 'text-primary bg-secondary border-border'
                : 'text-muted-foreground hover:text-foreground bg-card border-border hover:bg-secondary/70'
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
              <tr className="border-b border-border bg-secondary/40">
                {[
                  { label: 'Lead', field: 'full_name' as const },
                  { label: 'WA', field: null },
                  { label: 'Masuk', field: 'lead_entry_date' as const },
                  { label: 'PIC', field: null },
                  { label: 'Status', field: 'current_status' as const },
                  { label: 'Next', field: null },
                  { label: 'Update', field: null },
                  { label: 'Bayar', field: null },
                  { label: '', field: null },
                ].map((col) => (
                  <th
                    key={col.label || 'aksi'}
                    className={cn(
                      'px-3 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap',
                      col.field && 'cursor-pointer hover:text-foreground select-none',
                      !col.label && 'w-12 text-right'
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
                  <td colSpan={9} className="px-4 py-16 text-center text-muted-foreground/40 text-sm">
                    Tidak ada data leads yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const menuOpen = openActionId === lead.id
                  return (
                    <tr key={lead.id} className="hover:bg-secondary/30 transition-colors">
                      <td className="px-3 py-2.5 min-w-[10rem] max-w-[14rem]">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="block truncate text-[12px] font-semibold text-foreground hover:text-accent"
                        >
                          {lead.full_name}
                        </Link>
                        <p className="truncate text-[10px] text-muted-foreground mt-0.5">
                          {lead.source_campaign || '—'}
                        </p>
                      </td>

                      <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {lead.whatsapp_number}
                      </td>

                      <td className="px-3 py-2.5 text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatCellDate(lead.lead_entry_date)}
                      </td>

                      <td className="px-3 py-2.5 text-[11px] text-foreground/80 whitespace-nowrap max-w-[7rem] truncate">
                        {lead.users?.name || '—'}
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded-md text-[10px] font-semibold',
                            getStageBadgeClasses(lead.current_status)
                          )}
                        >
                          {lead.current_status}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap max-w-[7rem]">
                        <p className="truncate text-[11px] font-medium text-foreground">
                          {lead.next_action || '—'}
                        </p>
                        {lead.next_follow_up_date && (
                          <p className="text-[10px] text-muted-foreground">
                            FU {formatCellDate(lead.next_follow_up_date)}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={cn(
                            'text-[11px] font-medium',
                            daysSinceLastTouch(lead) >= 3 ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'
                          )}
                        >
                          {lastTouchLabel(lead)}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {renderPaymentSummary(lead)}
                      </td>

                      <td className="px-2 py-2.5 text-right">
                        <div
                          className="relative inline-block"
                          ref={menuOpen ? actionMenuRef : undefined}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenActionId((prev) => (prev === lead.id ? null : lead.id))
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
                            title="Aksi"
                            aria-expanded={menuOpen}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {menuOpen && (
                            <div className="absolute right-0 top-full z-30 mt-1 w-40 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
                              <Link
                                href={`/leads/${lead.id}`}
                                className="block px-3 py-2 text-left text-[12px] font-medium text-foreground hover:bg-secondary"
                                onClick={() => setOpenActionId(null)}
                              >
                                Detail
                              </Link>
                              <Link
                                href={`/leads/${lead.id}/edit`}
                                className="block px-3 py-2 text-left text-[12px] font-medium text-foreground hover:bg-secondary"
                                onClick={() => setOpenActionId(null)}
                              >
                                Edit
                              </Link>
                              {!isOwnerLike && (
                                <Link
                                  href={`/stage-1?lead=${lead.id}`}
                                  className="block px-3 py-2 text-left text-[12px] font-medium text-foreground hover:bg-secondary"
                                  onClick={() => setOpenActionId(null)}
                                >
                                  Kerjakan
                                </Link>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null)
                                  promptDelete(lead.id, lead.full_name)
                                }}
                                disabled={deletingId === lead.id}
                                className="block w-full px-3 py-2 text-left text-[12px] font-medium text-red-600 hover:bg-red-500/10 disabled:opacity-50"
                              >
                                Hapus
                              </button>
                            </div>
                          )}
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

      {csvModalOpen && createPortal(
        <CsvUploadModal
          isOpen={csvModalOpen}
          onClose={() => setCsvModalOpen(false)}
          pics={pics}
        />,
        document.body
      )}

      {mounted && deleteModalOpen && leadToDelete && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">Hapus lead dari database?</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Lead <span className="font-bold text-foreground">{leadToDelete.name}</span> akan dihapus permanen. Gunakan ini hanya untuk data salah input, spam, atau duplikat.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-700 dark:text-red-300">
                Gagal menghapus: {deleteError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false)
                  setLeadToDelete(null)
                  setDeleteError('')
                }}
                disabled={deletingId !== null}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground transition-colors hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-white/5"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId !== null ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && duplicateModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-foreground">Hapus data WhatsApp duplikat?</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Sistem menemukan <span className="font-bold text-foreground">{duplicateGroups.length}</span> nomor dobel. Data paling awal akan disimpan, lalu <span className="font-bold text-foreground">{duplicateDeleteIds.length}</span> data duplikat yang lebih baru akan dihapus.
                </p>
              </div>
            </div>

            <div className="mt-4 max-h-56 overflow-auto rounded-2xl border border-border bg-slate-50/50 p-3 dark:bg-white/[0.02]">
              <div className="space-y-2">
                {duplicateGroups.slice(0, 8).map(group => (
                  <div key={group.phone} className="rounded-xl border border-border bg-card px-3 py-2">
                    <p className="text-xs font-semibold text-foreground">{group.phone}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Simpan: <span className="font-bold text-foreground">{group.keep.full_name}</span> | Hapus: {group.duplicates.map(lead => lead.full_name).join(', ')}
                    </p>
                  </div>
                ))}
                {duplicateGroups.length > 8 && (
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    + {duplicateGroups.length - 8} grup duplikat lainnya.
                  </p>
                )}
              </div>
            </div>

            {duplicateError && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs font-semibold text-red-700 dark:text-red-300">
                Gagal menghapus duplikat: {duplicateError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDuplicateModalOpen(false)
                  setDuplicateError('')
                }}
                disabled={bulkDeletingDuplicates}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground transition-colors hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-white/5"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={deleteDuplicateLeads}
                disabled={bulkDeletingDuplicates}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkDeletingDuplicates && <Loader2 size={13} className="animate-spin" />}
                {bulkDeletingDuplicates ? 'Menghapus...' : `Hapus ${duplicateDeleteIds.length} Duplikat`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

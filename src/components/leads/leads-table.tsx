'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search, Filter, ExternalLink, MessageCircle,
  ChevronUp, ChevronDown, Copy, Calendar, RefreshCw,
  Edit, Trash2
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

export function LeadsTable({ initialLeads, pics }: LeadsTableProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus lead "${name}"?`)) return
    
    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.from('leads').delete().eq('id', id)
    setDeletingId(null)

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
        <p className="text-sm text-white/50">
          Ditemukan <span className="text-white font-bold">{filtered.length}</span> dari {initialLeads.length} leads
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
      <div className="glass-card rounded-2xl p-4 space-y-4 border border-white/5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, WhatsApp, email..."
              className="w-full pl-10 pr-4 py-2 rounded-xl text-xs text-white placeholder-white/20 outline-none"
              style={{ background: 'hsl(222,47%,10%)', border: '1px solid hsl(222,47%,18%)' }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border border-white/5 cursor-pointer',
              showFilters ? 'text-purple-400 bg-purple-500/10' : 'text-white/60 hover:text-white hover:bg-white/5'
            )}
            style={{ background: 'hsl(222,47%,10%)' }}
          >
            <Filter size={14} />
            Filter Lanjutan
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/5">
            {/* Status */}
            <div>
              <label className="block text-[10px] text-white/40 font-bold uppercase mb-1.5">Status Pipeline</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none cursor-pointer"
                style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
              >
                <option value="all">Semua Status</option>
                {statusesList.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* PIC */}
            <div>
              <label className="block text-[10px] text-white/40 font-bold uppercase mb-1.5">PIC CRO</label>
              <select
                value={filterPic}
                onChange={e => setFilterPic(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none cursor-pointer"
                style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
              >
                <option value="all">Semua PIC</option>
                {pics.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {/* Campaign Source */}
            <div>
              <label className="block text-[10px] text-white/40 font-bold uppercase mb-1.5">Source Campaign</label>
              <select
                value={filterCampaign}
                onChange={e => setFilterCampaign(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none cursor-pointer"
                style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
              >
                <option value="all">Semua Campaign</option>
                {campaignsList.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-[10px] text-white/40 font-bold uppercase mb-1.5">Status Pembayaran</label>
              <select
                value={filterPayment}
                onChange={e => setFilterPayment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none cursor-pointer"
                style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
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
              <label className="block text-[10px] text-white/40 font-bold uppercase mb-1.5">Status Seat Lock</label>
              <select
                value={filterSeatLock}
                onChange={e => setFilterSeatLock(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none cursor-pointer"
                style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
              >
                <option value="all">Semua Status</option>
                <option value="verified">Paid / Verified</option>
                <option value="pending">Pending Verification</option>
                <option value="not_paid">Belum Seat Lock</option>
              </select>
            </div>

            {/* Date Range Start */}
            <div>
              <label className="block text-[10px] text-white/40 font-bold uppercase mb-1.5">Mulai Tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none"
                style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
              />
            </div>

            {/* Date Range End */}
            <div>
              <label className="block text-[10px] text-white/40 font-bold uppercase mb-1.5">Hingga Tanggal</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-white outline-none"
                style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Table Data */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-white/10" style={{ background: 'rgba(255,255,255,0.01)' }}>
                {[
                  { label: 'Nama', field: 'full_name' as const },
                  { label: 'WhatsApp', field: null },
                  { label: 'Source Campaign', field: null },
                  { label: 'Tanggal Masuk', field: 'lead_entry_date' as const },
                  { label: 'PIC CRO', field: null },
                  { label: 'Status Saat Ini', field: 'current_status' as const },
                  { label: 'Last Contacted', field: null },
                  { label: 'Follow-up Result', field: null },
                  { label: 'Payment Status', field: null },
                  { label: 'Pemetaan Status', field: null },
                  { label: 'Expert Status', field: null },
                  { label: 'Seat Lock Status', field: null },
                  { label: 'Aksi', field: null }
                ].map(col => (
                  <th
                    key={col.label}
                    className={cn(
                      'px-4 py-3 font-semibold text-white/40 whitespace-nowrap',
                      col.field && 'cursor-pointer hover:text-white/70 select-none'
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
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-16 text-center text-white/20 text-sm">
                    Tidak ada data leads yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filtered.map(lead => {
                  // Resolve Relations Statuses
                  const pemetaanPayment = lead.payments?.find(p => p.payment_type === 'pemetaan')
                  const seatLockPayment = lead.payments?.find(p => p.payment_type === 'seat_lock')
                  const pemRecord = lead.pemetaan && lead.pemetaan.length > 0 ? lead.pemetaan[0] : null
                  const expRecord = lead.expert_consultations && lead.expert_consultations.length > 0 ? lead.expert_consultations[0] : null

                  return (
                    <tr key={lead.id} className="hover:bg-white/[0.01] transition-colors group">
                      {/* Name */}
                      <td className="px-4 py-3 font-bold text-white whitespace-nowrap">
                        <Link href={`/leads/${lead.id}`} className="hover:text-purple-300 transition-colors">
                          {lead.full_name}
                        </Link>
                      </td>

                      {/* WhatsApp */}
                      <td className="px-4 py-3 font-mono text-white/70 whitespace-nowrap">
                        {lead.whatsapp_number}
                      </td>

                      {/* Source Campaign */}
                      <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                        {lead.source_campaign}
                      </td>

                      {/* Tanggal Masuk */}
                      <td className="px-4 py-3 text-white/50 whitespace-nowrap">
                        {formatCellDate(lead.lead_entry_date)}
                      </td>

                      {/* PIC CRO */}
                      <td className="px-4 py-3 text-white/60 whitespace-nowrap">
                        {lead.users?.name || '-'}
                      </td>

                      {/* Status Saat Ini */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          {lead.current_status}
                        </span>
                      </td>

                      {/* Last Contacted */}
                      <td className="px-4 py-3 text-white/50 whitespace-nowrap">
                        {formatCellDate(lead.last_contacted_date)}
                      </td>

                      {/* Follow-up Result */}
                      <td className="px-4 py-3 text-white/60 max-w-[150px] truncate" title={lead.follow_up_result || ''}>
                        {lead.follow_up_result || '-'}
                      </td>

                      {/* Payment Status (Pemetaan) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {pemetaanPayment ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full font-semibold border text-[10px]",
                            pemetaanPayment.verification_status === 'verified' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                            pemetaanPayment.verification_status === 'pending' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                            pemetaanPayment.verification_status === 'rejected' && "bg-red-500/10 text-red-400 border-red-500/20"
                          )}>
                            {pemetaanPayment.verification_status.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-white/20">-</span>
                        )}
                      </td>

                      {/* Pemetaan Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {pemRecord ? (
                          <span className="text-white/70">
                            Form: <span className="font-semibold text-purple-400">{pemRecord.form_status}</span> | Result: <span className="font-semibold text-purple-400">{pemRecord.result_status}</span>
                          </span>
                        ) : (
                          <span className="text-white/25">Not Created</span>
                        )}
                      </td>

                      {/* Expert Status */}
                      <td className="px-4 py-3 whitespace-nowrap text-white/60">
                        {expRecord ? (
                          expRecord.consultation_result ? (
                            <span className="text-emerald-400 font-bold">{expRecord.consultation_result}</span>
                          ) : (
                            <span className="text-white/40">Scheduled</span>
                          )
                        ) : (
                          <span className="text-white/20">-</span>
                        )}
                      </td>

                      {/* Seat Lock Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {seatLockPayment ? (
                          <span className={cn(
                            "px-2 py-0.5 rounded-full font-semibold border text-[10px]",
                            seatLockPayment.verification_status === 'verified' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                            seatLockPayment.verification_status === 'pending' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                            seatLockPayment.verification_status === 'rejected' && "bg-red-500/10 text-red-400 border-red-500/20"
                          )}>
                            PAID
                          </span>
                        ) : (
                          <span className="text-white/20">UNPAID</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setActiveLead(lead)
                              setWaModalOpen(true)
                            }}
                            className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Kirim Pesan WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </button>
                          <Link
                            href={`/leads/${lead.id}`}
                            className="p-1 rounded-lg text-purple-400 hover:bg-purple-500/10 transition-colors"
                            title="Lihat Detail"
                          >
                            <ExternalLink size={14} />
                          </Link>
                          <Link
                            href={`/leads/${lead.id}/edit`}
                            className="p-1 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                            title="Edit Lead"
                          >
                            <Edit size={14} />
                          </Link>
                          <button
                            onClick={() => handleDelete(lead.id, lead.full_name)}
                            disabled={deletingId === lead.id}
                            className="p-1 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
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
    </div>
  )
}

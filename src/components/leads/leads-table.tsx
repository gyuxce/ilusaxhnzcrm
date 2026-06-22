'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, Filter, ExternalLink, MessageCircle,
  ChevronUp, ChevronDown, Copy, AlertTriangle
} from 'lucide-react'
import { cn, STAGE_LABELS, SOURCE_LABELS, SOURCE_ICONS, generateWALink, formatDate } from '@/lib/utils'
import type { Lead, LeadStage, LeadSource } from '@/lib/supabase/types'
import { WhatsAppModal } from './WhatsAppModal'

// @ts-ignore - extended type with joins
type LeadWithRelations = Lead & {
  users?: { id: string; full_name: string } | null
  campaigns?: { id: string; name: string } | null
}

const STAGE_CONFIG = {
  new: { label: 'Baru', textColor: 'text-slate-400', bg: 'rgba(100,116,139,0.15)', border: 'rgba(100,116,139,0.3)' },
  probing: { label: 'Probing', textColor: 'text-blue-400', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
  hot: { label: 'Hot', textColor: 'text-orange-400', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.3)' },
  potential: { label: 'Potensial', textColor: 'text-yellow-400', bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.3)' },
  converted: { label: 'Konversi', textColor: 'text-green-400', bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.3)' },
  rejected: { label: 'Reject', textColor: 'text-red-400', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
}

const SOURCE_ICON_MAP: Record<string, string> = {
  ig: '📸', fb: '📘', linkedin: '💼', webinar: '🎓', manual: '✍️', referral: '🤝', other: '📌'
}

interface LeadsTableProps {
  initialLeads: LeadWithRelations[]
  pics: { id: string; full_name: string }[]
  campaigns: { id: string; name: string }[]
}

export function LeadsTable({ initialLeads, pics, campaigns }: LeadsTableProps) {
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState<LeadStage | 'all'>('all')
  const [filterSource, setFilterSource] = useState<LeadSource | 'all'>('all')
  const [filterPic, setFilterPic] = useState('all')
  const [sortField, setSortField] = useState<'created_at' | 'name' | 'stage'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [waModalOpen, setWaModalOpen] = useState(false)
  const [activeLead, setActiveLead] = useState<any>(null)

  const filtered = useMemo(() => {
    let data = [...initialLeads]

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.phone_number.includes(q) ||
        l.notes?.toLowerCase().includes(q)
      )
    }
    if (filterStage !== 'all') data = data.filter(l => l.stage === filterStage)
    if (filterSource !== 'all') data = data.filter(l => l.source === filterSource)
    if (filterPic !== 'all') data = data.filter(l => l.pic_id === filterPic)

    data.sort((a, b) => {
      let av = sortField === 'created_at' ? a.created_at : sortField === 'name' ? (a.name || '') : a.stage
      let bv = sortField === 'created_at' ? b.created_at : sortField === 'name' ? (b.name || '') : b.stage
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

    return data
  }, [initialLeads, search, filterStage, filterSource, filterPic, sortField, sortDir])

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

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">
          <span className="text-white font-semibold">{filtered.length}</span> leads ditemukan
        </p>
        <Link
          href="/leads/new"
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
        >
          + Tambah Lead
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card rounded-2xl p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, nomor HP..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm text-white placeholder-white/25 outline-none"
              style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all',
              showFilters ? 'text-purple-400' : 'text-white/50 hover:text-white/70'
            )}
            style={{ border: '1px solid hsl(222,47%,20%)', background: 'hsl(222,47%,12%)' }}
          >
            <Filter size={14} />
            Filter
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
            {/* Stage filter */}
            <select
              value={filterStage}
              onChange={e => setFilterStage(e.target.value as LeadStage | 'all')}
              className="px-3 py-2 rounded-xl text-sm text-white outline-none"
              style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
            >
              <option value="all">Semua Stage</option>
              {Object.entries(STAGE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>

            {/* Source filter */}
            <select
              value={filterSource}
              onChange={e => setFilterSource(e.target.value as LeadSource | 'all')}
              className="px-3 py-2 rounded-xl text-sm text-white outline-none"
              style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
            >
              <option value="all">Semua Source</option>
              {Object.entries(SOURCE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{SOURCE_ICON_MAP[v]} {l}</option>
              ))}
            </select>

            {/* PIC filter */}
            <select
              value={filterPic}
              onChange={e => setFilterPic(e.target.value)}
              className="px-3 py-2 rounded-xl text-sm text-white outline-none"
              style={{ background: 'hsl(222,47%,12%)', border: '1px solid hsl(222,47%,20%)' }}
            >
              <option value="all">Semua PIC</option>
              {pics.map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(222,47%,14%)' }}>
                {[
                  { label: 'Nama', field: 'name' as const },
                  { label: 'Nomor HP', field: null },
                  { label: 'Source', field: null },
                  { label: 'Stage', field: 'stage' as const },
                  { label: 'PIC', field: null },
                  { label: 'Tanggal', field: 'created_at' as const },
                  { label: 'Aksi', field: null },
                ].map(col => (
                  <th
                    key={col.label}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium text-white/40 whitespace-nowrap',
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
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-white/30 text-sm">
                    Tidak ada leads yang ditemukan
                  </td>
                </tr>
              ) : (
                filtered.map((lead, i) => {
                  const stageConf = STAGE_CONFIG[lead.stage] || STAGE_CONFIG.new
                  return (
                    <tr
                      key={lead.id}
                      className="group hover:bg-white/[0.02] transition-colors"
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid hsl(222,47%,11%)' : 'none' }}
                    >
                      {/* Nama */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ background: stageConf.bg, color: stageConf.textColor.replace('text-', '') }}
                          >
                            {(lead.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <Link
                              href={`/leads/${lead.id}`}
                              className="font-medium text-white hover:text-purple-300 transition-colors flex items-center gap-1"
                            >
                              {lead.name || 'Tanpa Nama'}
                              {lead.is_duplicate && (
                                <span title="Duplikat terdeteksi">
                                  <AlertTriangle size={11} className="text-yellow-400" />
                                </span>
                              )}
                            </Link>
                            {lead.notes && (
                              <p className="text-xs text-white/30 truncate max-w-[180px]">{lead.notes}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/70 font-mono text-xs">{lead.phone_number}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(lead.phone_number)}
                            className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-white/60 transition-all"
                            title="Salin nomor"
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-xs text-white/60">
                          <span>{SOURCE_ICON_MAP[lead.source] || '📌'}</span>
                          {SOURCE_LABELS[lead.source] || lead.source}
                        </span>
                      </td>

                      {/* Stage */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            background: stageConf.bg,
                            color: stageConf.textColor.replace('text-', 'hsl') || '#64748b',
                            border: `1px solid ${stageConf.border}`,
                          }}
                        >
                          {stageConf.label}
                        </span>
                      </td>

                      {/* PIC */}
                      <td className="px-4 py-3 text-xs text-white/50">
                        {/* @ts-ignore */}
                        {lead.users?.full_name || '-'}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">
                        {formatDate(lead.inbound_date || lead.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              setActiveLead(lead)
                              setWaModalOpen(true)
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-500/10 transition-colors"
                            title="Kirim Template WA"
                          >
                            <MessageCircle size={14} />
                          </button>
                          <Link
                            href={`/leads/${lead.id}`}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-purple-400 hover:bg-purple-500/10 transition-colors"
                            title="Detail"
                          >
                            <ExternalLink size={14} />
                          </Link>
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
          leadName={activeLead.name || 'Tanpa Nama'}
          leadPhone={activeLead.phone_number}
        />
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Loader2,
  Trash2,
  Pencil,
  ClipboardCheck,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Lead, PaymentRow, PemetaanRow, ExpertConsultationRow } from '@/lib/supabase/types'
import { CsvUploadModal } from './csv-upload-modal'
import { getStageBadgeClasses } from '@/lib/brand'
import {
  consumeLeadsListNeedsRefresh,
  fetchLeadsListingClient,
} from '@/lib/leads-list-refresh'
import { readPrdTrialSinceClient } from '@/lib/prd-trial-mode'
import { STAGE1_LEGACY_NEW_LEAD } from '@/lib/prd-stages'
import { ENTITIES, resolveEntity, type Entity } from '@/lib/entity'
import { useCampaignOverrides } from '@/lib/use-campaign-overrides'
import { EntityBadge } from './entity-badge'

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

function displayStatus(status: string) {
  return status === STAGE1_LEGACY_NEW_LEAD ? 'Input Manual' : status
}

function daysSinceLastTouch(lead: LeadWithRelations) {
  const latestDate = lead.last_contacted_date || lead.updated_at || lead.lead_entry_date
  if (!latestDate) return 0
  const diffMs = Date.now() - new Date(latestDate).getTime()
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
}

function lastTouchLabel(lead: LeadWithRelations) {
  const days = daysSinceLastTouch(lead)
  if (days === 0) return 'Hari ini'
  if (days === 1) return '1 hari lalu'
  return `${days} hari lalu`
}

export function LeadsTable({ initialLeads, pics }: LeadsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [leads, setLeads] = useState<LeadWithRelations[]>(initialLeads)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || 'all')
  const [filterEntity, setFilterEntity] = useState<'all' | Entity>('all')
  const campaignOverrides = useCampaignOverrides()
  const [sortField, setSortField] = useState<'full_name' | 'lead_entry_date' | 'current_status'>('lead_entry_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [csvModalOpen, setCsvModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<{ id: string; name: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [mounted, setMounted] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  useEffect(() => {
    setMounted(true)
  }, [])


  useEffect(() => {
    setLeads(initialLeads)
  }, [initialLeads])

  useEffect(() => {
    const statusParam = searchParams.get('status')
    if (statusParam) setFilterStatus(statusParam)
  }, [searchParams])

  const refreshLeadsFromServer = async (force = false) => {
    if (!force && !consumeLeadsListNeedsRefresh()) return
    try {
      const supabase = createClient()
      const trialSince = readPrdTrialSinceClient()
      const data = await fetchLeadsListingClient(supabase, trialSince)
      setLeads(data as LeadWithRelations[])
    } catch {
      router.refresh()
    }
  }

  useEffect(() => {
    if (consumeLeadsListNeedsRefresh()) {
      void refreshLeadsFromServer(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const statusesList = useMemo(() => {
    const set = new Set<string>()
    leads.forEach((l) => {
      if (l.current_status) set.add(displayStatus(l.current_status))
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [leads])

  const filtered = useMemo(() => {
    let data = [...leads]

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(
        (l) =>
          l.full_name.toLowerCase().includes(q) ||
          l.whatsapp_number.includes(q) ||
          l.source_campaign?.toLowerCase().includes(q)
      )
    }

    if (filterStatus !== 'all') {
      data = data.filter((l) => displayStatus(l.current_status) === filterStatus)
    }

    if (filterEntity !== 'all') {
      data = data.filter((l) => resolveEntity(l.source_campaign, campaignOverrides) === filterEntity)
    }

    data.sort((a, b) => {
      const av =
        sortField === 'lead_entry_date'
          ? a.lead_entry_date
          : sortField === 'full_name'
            ? a.full_name
            : displayStatus(a.current_status)
      const bv =
        sortField === 'lead_entry_date'
          ? b.lead_entry_date
          : sortField === 'full_name'
            ? b.full_name
            : displayStatus(b.current_status)
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

    return data
  }, [leads, search, filterStatus, filterEntity, sortField, sortDir, campaignOverrides])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStartIndex = filtered.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1
  const pageEndIndex = Math.min(safeCurrentPage * pageSize, filtered.length)
  const paginatedLeads = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, safeCurrentPage])

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function renderSortIcon(field: typeof sortField) {
    if (sortField !== field) return <ChevronUp size={12} className="text-muted-foreground/30" />
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-accent" />
    ) : (
      <ChevronDown size={12} className="text-accent" />
    )
  }

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    window.setTimeout(() => setToast(null), 3200)
  }

  const confirmDelete = async () => {
    if (!leadToDelete) return
    setDeletingId(leadToDelete.id)
    setDeleteError('')
    const supabase = createClient()
    // .select() wajib — tanpa ini Supabase bisa "sukses" meski 0 baris terhapus
    // (RLS / FK), UI hilang sementara, refresh data muncul lagi.
    const { data, error } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadToDelete.id)
      .select('id')
    if (error) {
      setDeleteError(error.message)
      setDeletingId(null)
      return
    }
    if (!data?.length) {
      setDeleteError(
        'Gagal menghapus di database (0 baris). Biasanya karena izin RLS atau masih ada data terkait. Pakai SQL cleanup di Supabase.'
      )
      setDeletingId(null)
      return
    }
    setLeads((prev) => prev.filter((l) => l.id !== leadToDelete.id))
    setDeleteModalOpen(false)
    setLeadToDelete(null)
    setDeletingId(null)
    showToast('success', 'Lead berhasil dihapus dari database.')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {toast && (
        <div
          className={cn(
            'fixed right-5 top-5 z-50 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl',
            toast.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'border-red-500/20 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
          )}
        >
          {toast.text}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Ditemukan <span className="text-foreground font-semibold">{filtered.length}</span> dari {leads.length} leads
          {filtered.length > 0 && (
            <span className="ml-2 text-xs">
              · {pageStartIndex}-{pageEndIndex}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCsvModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-foreground bg-card border border-border hover:bg-secondary"
          >
            <FileUp size={14} />
            Import CSV
          </button>
          <Link
            href="/leads/new"
            className="flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold text-accent-foreground bg-accent hover:opacity-90"
          >
            + Tambah Lead
          </Link>
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-border p-3">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            placeholder="Cari nama, WhatsApp, campaign..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs text-foreground placeholder-muted-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-border">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="flex items-center gap-1 cursor-pointer select-none text-left"
                      onClick={() => toggleSort('full_name')}
                    >
                      Nama {renderSortIcon('full_name')}
                    </button>
                    <select
                      value={filterEntity}
                      onChange={(e) => {
                        setFilterEntity(e.target.value as 'all' | Entity)
                        setCurrentPage(1)
                      }}
                      className="w-full max-w-[7rem] rounded-md border border-border bg-card px-1.5 py-1 text-[10px] font-medium text-foreground outline-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="all">Semua entitas</option>
                      {ENTITIES.map((e) => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </div>
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                  Nomor WhatsApp
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="flex items-center gap-1 cursor-pointer select-none text-left"
                      onClick={() => toggleSort('current_status')}
                    >
                      Current Status {renderSortIcon('current_status')}
                    </button>
                    <select
                      value={filterStatus}
                      onChange={(e) => {
                        setFilterStatus(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="w-full max-w-[11rem] rounded-md border border-border bg-card px-1.5 py-1 text-[10px] font-medium text-foreground outline-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="all">Semua status</option>
                      {statusesList.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                  Last Update
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                  Aksi
                </th>
                <th className="px-3 py-2.5 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                  Kerjakan
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted-foreground/40 text-sm">
                    Tidak ada data leads yang cocok.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-3 py-2.5 min-w-[10rem] max-w-[16rem]">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="block truncate text-[12px] font-semibold text-foreground hover:text-accent"
                      >
                        {lead.full_name}
                      </Link>
                      <p className="flex min-w-0 items-center gap-1.5 mt-0.5">
                        <span className="min-w-0 truncate text-[10px] text-muted-foreground">
                          {lead.source_campaign || '—'}
                        </span>
                        <EntityBadge sourceCampaign={lead.source_campaign} overrides={campaignOverrides} />
                      </p>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {lead.whatsapp_number}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded-md text-[10px] font-semibold',
                          getStageBadgeClasses(lead.current_status)
                        )}
                      >
                        {displayStatus(lead.current_status)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span
                        className={cn(
                          'text-[11px] font-medium',
                          daysSinceLastTouch(lead) >= 3
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-muted-foreground'
                        )}
                      >
                        {lastTouchLabel(lead)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
                          title="Riwayat / detail"
                        >
                          <Clock size={15} />
                        </Link>
                        <Link
                          href={`/leads/${lead.id}/edit`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError('')
                            setLeadToDelete({ id: lead.id, name: lead.full_name })
                            setDeleteModalOpen(true)
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Link
                        href={`/stage-1?lead=${lead.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-semibold text-accent-foreground hover:opacity-90"
                      >
                        <ClipboardCheck size={13} />
                        Kerjakan
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > pageSize && (
          <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2.5">
            <p className="text-[11px] text-muted-foreground">
              Halaman {safeCurrentPage} / {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {csvModalOpen &&
        createPortal(
          <CsvUploadModal
            isOpen={csvModalOpen}
            onClose={() => setCsvModalOpen(false)}
            pics={pics}
            onImportSuccess={() => void refreshLeadsFromServer(true)}
          />,
          document.body
        )}

      {mounted &&
        deleteModalOpen &&
        leadToDelete &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <h3 className="font-display text-base font-semibold text-foreground">Hapus lead?</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Lead <span className="font-semibold text-foreground">{leadToDelete.name}</span> akan dihapus permanen.
              </p>
              {deleteError && (
                <p className="mt-2 text-xs font-semibold text-destructive">{deleteError}</p>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalOpen(false)
                    setLeadToDelete(null)
                  }}
                  className="px-3 py-2 text-xs font-semibold text-muted-foreground"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={Boolean(deletingId)}
                  onClick={confirmDelete}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-destructive px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {deletingId && <Loader2 size={14} className="animate-spin" />}
                  Hapus
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

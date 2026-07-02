import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { LOST_REASON_OPTIONS, LOST_REASON_STRATEGY, LOST_STATUSES } from '@/lib/lost-reasons'
import { AlertTriangle, BarChart3, CheckCircle2, Lightbulb, Tag, Users } from 'lucide-react'

export const dynamic = 'force-dynamic'

type RejectedLead = {
  id: string
  full_name: string
  whatsapp_number: string
  source_campaign: string
  current_status: string
  lost_reason: string | null
  assigned_cro_id: string | null
  updated_at: string
  assigned_cro?: { id: string; name: string } | null
}

function percent(value: number, total: number) {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

export default async function PlaybookPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('leads')
    .select(`
      id,
      full_name,
      whatsapp_number,
      source_campaign,
      current_status,
      lost_reason,
      assigned_cro_id,
      updated_at,
      assigned_cro:assigned_cro_id(id, name)
    `)
    .in('current_status', LOST_STATUSES)
    .order('updated_at', { ascending: false })

  const rejectedLeads = (data || []) as RejectedLead[]
  const totalRejected = rejectedLeads.length
  const categorized = rejectedLeads.filter(lead => lead.lost_reason).length
  const uncategorized = totalRejected - categorized

  const reasonRows = LOST_REASON_OPTIONS.map(reason => {
    const leads = rejectedLeads.filter(lead => lead.lost_reason === reason)
    return {
      reason,
      count: leads.length,
      percent: percent(leads.length, totalRejected),
      strategy: LOST_REASON_STRATEGY[reason],
    }
  }).filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count)

  const campaignRows = Object.entries(
    rejectedLeads.reduce<Record<string, { total: number; reasons: Record<string, number> }>>((acc, lead) => {
      const campaign = lead.source_campaign || 'Tanpa campaign'
      const reason = lead.lost_reason || 'Belum dikategorikan'
      if (!acc[campaign]) acc[campaign] = { total: 0, reasons: {} }
      acc[campaign].total += 1
      acc[campaign].reasons[reason] = (acc[campaign].reasons[reason] || 0) + 1
      return acc
    }, {})
  ).map(([campaign, data]) => {
    const topReason = Object.entries(data.reasons).sort((a, b) => b[1] - a[1])[0]
    return {
      campaign,
      total: data.total,
      topReason: topReason?.[0] || '-',
    }
  }).sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const teamRows = Object.entries(
    rejectedLeads.reduce<Record<string, { name: string; total: number; uncategorized: number }>>((acc, lead) => {
      const key = lead.assigned_cro_id || 'unassigned'
      const name = lead.assigned_cro?.name || 'Belum di-assign'
      if (!acc[key]) acc[key] = { name, total: 0, uncategorized: 0 }
      acc[key].total += 1
      if (!lead.lost_reason) acc[key].uncategorized += 1
      return acc
    }, {})
  ).map(([id, row]) => ({ id, ...row }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)

  const topReason = reasonRows[0]

  return (
    <>
      <Header title="Reason Penolakan" subtitle="Kelompokkan alasan Not Interested agar strategi follow up lebih jelas." />
      <div className="p-6 animate-fade-in max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Rejected', value: totalRejected, icon: Users, tone: 'hsl(250,84%,64%)' },
            { label: 'Sudah Ada Reason', value: categorized, icon: CheckCircle2, tone: 'hsl(160,84%,39%)' },
            { label: 'Belum Dikategorikan', value: uncategorized, icon: AlertTriangle, tone: 'hsl(38,92%,50%)' },
            { label: 'Kategori Terbesar', value: topReason ? topReason.reason : '-', icon: Tag, tone: 'hsl(340,82%,58%)', small: true },
          ].map(card => (
            <div key={card.label} className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">{card.label}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${card.tone}20` }}>
                  <card.icon size={16} style={{ color: card.tone }} />
                </div>
              </div>
              <p className={card.small ? 'mt-5 text-sm font-black text-foreground leading-snug' : 'mt-5 text-3xl font-black text-foreground'}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Kategori Alasan</h2>
                <p className="text-xs text-muted-foreground mt-1">Gunakan pola ini untuk menentukan script follow up berikutnya.</p>
              </div>
              <BarChart3 size={18} className="text-primary" />
            </div>

            <div className="space-y-4">
              {reasonRows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Belum ada lead yang punya kategori penolakan.</p>
              ) : reasonRows.map(row => (
                <div key={row.reason} className="rounded-xl border border-border bg-slate-50/70 p-4 dark:bg-white/[0.02]">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-extrabold text-foreground">{row.reason}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{row.strategy}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-primary">{row.count}</p>
                      <p className="text-[10px] text-muted-foreground">{row.percent}% dari rejected</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(row.percent, 4)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="mb-5 flex items-center gap-2">
              <Lightbulb size={18} className="text-amber-500" />
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Catatan Strategi</h2>
            </div>
            <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                Saat lead berubah ke <span className="font-bold text-foreground">Not Interested</span>, tim wajib memilih kategori alasan.
                Ini membantu owner melihat apakah masalah utama ada di uang, trust, timing, atau positioning program.
              </p>
              <p>
                Kalau kategori <span className="font-bold text-foreground">Belum Dikategorikan</span> tinggi, berarti tim perlu merapikan data lama
                atau belum konsisten mengisi reason.
              </p>
              <p>
                Untuk reason baru yang sering muncul, masukkan ke kategori tetap berikutnya agar report makin tajam.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Campaign Dengan Penolakan</h2>
              <span className="text-xs text-muted-foreground">{campaignRows.length} campaign</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-3 pr-4">Campaign</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 pl-4">Reason Dominan</th>
                  </tr>
                </thead>
                <tbody>
                  {campaignRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-xs text-muted-foreground">Belum ada data.</td>
                    </tr>
                  ) : campaignRows.map(row => (
                    <tr key={row.campaign} className="border-b border-border/70 last:border-b-0">
                      <td className="py-3 pr-4 font-bold text-foreground">{row.campaign}</td>
                      <td className="py-3 px-4 text-right font-black text-primary">{row.total}</td>
                      <td className="py-3 pl-4 text-muted-foreground">{row.topReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Kerapian Per PIC</h2>
              <span className="text-xs text-muted-foreground">{teamRows.length} PIC</span>
            </div>
            <div className="space-y-3">
              {teamRows.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">Belum ada data PIC.</p>
              ) : teamRows.map(row => (
                <div key={row.id} className="flex items-center justify-between gap-3 border-b border-border/70 pb-3 last:border-b-0 last:pb-0">
                  <div>
                    <p className="text-sm font-bold text-foreground">{row.name}</p>
                    <p className="text-[11px] text-muted-foreground">{row.uncategorized} belum punya kategori</p>
                  </div>
                  <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-black text-foreground">
                    {row.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Lead Rejected Terakhir</h2>
              <p className="mt-1 text-xs text-muted-foreground">Klik nama lead untuk membuka detail dan melengkapi reason.</p>
            </div>
            <span className="text-xs text-muted-foreground">{rejectedLeads.length} lead</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4">Lead</th>
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 pl-4">PIC</th>
                </tr>
              </thead>
              <tbody>
                {rejectedLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">Belum ada lead rejected.</td>
                  </tr>
                ) : rejectedLeads.slice(0, 30).map(lead => (
                  <tr key={lead.id} className="border-b border-border/70 last:border-b-0">
                    <td className="py-3 pr-4">
                      <Link href={`/leads/${lead.id}`} className="font-bold text-foreground hover:text-primary hover:underline">
                        {lead.full_name}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">{lead.whatsapp_number}</p>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{lead.source_campaign}</td>
                    <td className="py-3 px-4">
                      <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-300">
                        {lead.current_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{lead.lost_reason || 'Belum dikategorikan'}</td>
                    <td className="py-3 pl-4 text-muted-foreground">{lead.assigned_cro?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

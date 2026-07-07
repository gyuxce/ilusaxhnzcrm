import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Lightbulb,
  MessageSquareText,
  Sparkles,
  Target,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type InterventionRow = {
  id: string
  lead_id: string
  created_by: string | null
  lead_condition: string | null
  objection_category: string | null
  solution_given: string | null
  expert_needed: boolean | null
  expert_type: string | null
  commercial_type: string | null
  service_opportunity: string | null
  next_action: string | null
  next_follow_up_date: string | null
  result: string | null
  notes: string | null
  created_at: string
  users?: { id?: string; name?: string } | null
  leads?: {
    id: string
    full_name: string
    whatsapp_number: string
    source_campaign: string
    current_status: string
  } | null
}

type CountRow = {
  name: string
  count: number
  percent: number
}

function percent(value: number, total: number) {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

function countBy<T>(
  rows: T[],
  getKey: (row: T) => string | null | undefined,
  total: number,
  limit = 8
): CountRow[] {
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    const key = getKey(row)?.trim() || 'Belum dikategorikan'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return Object.entries(counts)
    .map(([name, count]) => ({ name, count, percent: percent(count, total) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  })
}

function getRecommendation(item: InterventionRow) {
  const objection = (item.objection_category || '').toLowerCase()
  const needsExpert = item.expert_needed || item.expert_type
  const potentialPaid = (item.commercial_type || '').toLowerCase().includes('paid')

  if (needsExpert) return `Teruskan ke ${item.expert_type || 'tim terkait'} dan pastikan jadwal/hasil tercatat.`
  if (potentialPaid) return 'Validasi kebutuhan, siapkan opsi layanan berbayar, lalu follow up value-nya.'
  if (objection.includes('budget') || objection.includes('biaya') || objection.includes('uang')) {
    return 'Tekankan value program, opsi timeline pembayaran, dan bukti hasil/alumni.'
  }
  if (objection.includes('waktu') || objection.includes('sibuk')) {
    return 'Tawarkan slot follow-up spesifik dan ringkas benefit yang paling relevan.'
  }
  if (objection.includes('trust') || objection.includes('ragu')) {
    return 'Kirim social proof, alur program, dan ajak konsultasi singkat untuk klarifikasi.'
  }
  return 'Gunakan solusi terakhir sebagai basis follow-up, lalu update next action setelah respon.'
}

export default async function PlaybookPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lead_interventions')
    .select(`
      id,
      lead_id,
      created_by,
      lead_condition,
      objection_category,
      solution_given,
      expert_needed,
      expert_type,
      commercial_type,
      service_opportunity,
      next_action,
      next_follow_up_date,
      result,
      notes,
      created_at,
      users:created_by(id, name),
      leads:lead_id(id, full_name, whatsapp_number, source_campaign, current_status)
    `)
    .order('created_at', { ascending: false })
    .limit(500)

  const interventions = ((data || []) as InterventionRow[]).filter(item => item.leads)
  const total = interventions.length
  const expertRows = interventions.filter(item => item.expert_needed || item.expert_type)
  const potentialPaidRows = interventions.filter(item => (item.commercial_type || '').toLowerCase().includes('paid'))
  const withFollowUp = interventions.filter(item => item.next_follow_up_date)
  const _solvedRows = interventions.filter(item => item.result)

  const objectionRows = countBy(interventions, item => item.objection_category, total, 8)
  const solutionRows = countBy(interventions, item => item.solution_given, total, 8)
  const campaignRows = countBy(interventions, item => item.leads?.source_campaign, total, 8)
  const expertTypeRows = countBy(expertRows, item => item.expert_type || 'Butuh expert', expertRows.length, 6)
  const paidByCampaignRows = countBy(potentialPaidRows, item => item.leads?.source_campaign, potentialPaidRows.length, 6)
  const topObjection = objectionRows[0]

  const priorityRows = [...interventions]
    .map(item => ({
      item,
      score:
        (item.expert_needed || item.expert_type ? 4 : 0) +
        ((item.commercial_type || '').toLowerCase().includes('paid') ? 3 : 0) +
        (item.next_follow_up_date ? 2 : 0) +
        (!item.result ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(entry => entry.item)

  return (
    <>
      <Header
        title="Alasan Gagal"
        subtitle="Ringkasan kendala lead, respon CRO, bantuan yang dibutuhkan, dan peluang tambahan dari chat harian."
      />

      <div className="w-full space-y-6 p-6 animate-fade-in">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Gagal memuat analisis alasan gagal: {error.message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {[
            { label: 'Total Catatan', value: total, icon: MessageSquareText, tone: 'hsl(250,84%,64%)' },
            { label: 'Kendala Terbanyak', value: topObjection?.name || '-', icon: AlertTriangle, tone: 'hsl(24,95%,53%)', small: true },
            { label: 'Perlu Dibantu', value: expertRows.length, icon: Sparkles, tone: 'hsl(38,92%,50%)' },
            { label: 'Bisa Berbayar', value: potentialPaidRows.length, icon: BriefcaseBusiness, tone: 'hsl(210,100%,56%)' },
            { label: 'Ada Follow-Up', value: withFollowUp.length, icon: CheckCircle2, tone: 'hsl(160,84%,39%)' },
          ].map(card => (
            <div key={card.label} className="rounded-2xl border border-border bg-card p-4 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted-foreground">{card.label}</span>
                <div className="flex size-8 items-center justify-center rounded-xl" style={{ background: `${card.tone}20` }}>
                  <card.icon size={16} style={{ color: card.tone }} />
                </div>
              </div>
              <p className={card.small ? 'mt-5 truncate text-sm font-black text-foreground' : 'mt-5 text-3xl font-black text-foreground'}>
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-xs">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Kendala yang Paling Sering Muncul</h2>
                <p className="mt-1 text-xs text-muted-foreground">Kendala yang paling sering dicatat dari chat CRO.</p>
              </div>
              <BarChart3 size={18} className="text-primary" />
            </div>

            <div className="space-y-4">
              {objectionRows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">Belum ada catatan kendala.</p>
              ) : objectionRows.map(row => (
                <div key={row.name} className="rounded-xl border border-border bg-slate-50/70 p-4 dark:bg-white/[0.02]">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-extrabold text-foreground">{row.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.count} catatan, {row.percent}% dari semua kendala.
                      </p>
                    </div>
                    <Link
                      href={`/reports?date=${new Date().toISOString().split('T')[0]}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                    >
                      Cek report
                      <ArrowRight size={12} />
                    </Link>
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
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Catatan Buat Keputusan</h2>
            </div>
            <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                Halaman ini membaca <span className="font-bold text-foreground">Catatan Chat</span>, bukan sekadar status Not Interested.
                Jadi yang terlihat di sini adalah kendala, respon CRO, dan peluang layanan dari aktivitas nyata CRO.
              </p>
              <p>
                Gunakan <span className="font-bold text-foreground">Bisa Berbayar</span> untuk melihat peluang layanan tambahan, dan
                <span className="font-bold text-foreground"> Perlu Dibantu</span> untuk melihat lead yang perlu dibantu sensei/tim lain.
              </p>
              <p>
                Kalau kendala dominan berulang, buat script atau offer khusus agar respon tim makin seragam.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <InsightTable
            title="Respon CRO yang Paling Sering Dipakai"
            subtitle="Membantu validasi apakah respon CRO sudah seragam."
            rows={solutionRows}
            empty="Belum ada respon CRO yang tercatat."
          />
          <InsightTable
            title="Campaign Paling Banyak Kendala"
            subtitle="Membantu cek kualitas lead atau pesan campaign."
            rows={campaignRows}
            empty="Belum ada campaign yang tercatat."
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <InsightTable
            title="Perlu Dibantu"
            subtitle={`${expertRows.length} catatan membutuhkan bantuan sensei atau tim lain.`}
            rows={expertTypeRows}
            empty="Belum ada kebutuhan expert."
          />
          <InsightTable
            title="Bisa Berbayar per Campaign"
            subtitle={`${potentialPaidRows.length} catatan berpotensi menjadi layanan berbayar.`}
            rows={paidByCampaignRows}
            empty="Belum ada peluang berbayar."
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Kasus Prioritas</h2>
              <p className="mt-1 text-xs text-muted-foreground">Lead yang perlu dibantu, bisa berbayar, ada follow-up, atau belum punya hasil chat.</p>
            </div>
            <span className="text-xs text-muted-foreground">{priorityRows.length} dari {total} catatan</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-3 pr-4">Lead</th>
                  <th className="py-3 px-4">Kendala</th>
                  <th className="py-3 px-4">Respon CRO</th>
                  <th className="py-3 px-4">Peluang</th>
                  <th className="py-3 px-4">Langkah</th>
                  <th className="py-3 pl-4">Rekomendasi</th>
                </tr>
              </thead>
              <tbody>
                {priorityRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted-foreground">Belum ada kasus prioritas.</td>
                  </tr>
                ) : priorityRows.map(item => (
                  <tr key={item.id} className="border-b border-border/70 last:border-b-0">
                    <td className="py-3 pr-4">
                      <Link href={`/leads/${item.leads?.id}`} className="font-bold text-foreground hover:text-primary hover:underline">
                        {item.leads?.full_name || 'Lead tidak ditemukan'}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">{item.leads?.source_campaign || '-'}</p>
                      <p className="text-[10px] text-muted-foreground">CRO: {item.users?.name || 'Unknown'}</p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-foreground">{item.objection_category || '-'}</td>
                    <td className="py-3 px-4 text-muted-foreground">{item.solution_given || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className="inline-flex rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-300">
                          {item.commercial_type || 'Free'}
                        </span>
                        {(item.expert_needed || item.expert_type) && (
                          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-300">Perlu dibantu: {item.expert_type || 'Ya'}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {item.next_action || '-'}
                      <p className="text-[10px]">{formatDate(item.next_follow_up_date)}</p>
                    </td>
                    <td className="py-3 pl-4 text-xs leading-relaxed text-muted-foreground">{getRecommendation(item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <Target size={18} className="text-primary" />
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">Cara Pakai Buat Tim</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              {
                title: '1. Catat Kondisi',
                body: 'Saat CRO mengerjakan lead, isi kondisi lead dan kendala utama di Kerjaan Hari Ini.',
              },
              {
                title: '2. Pilih Solusi',
                body: 'Isi respon yang diberikan, lalu tandai gratis/berbayar dan apakah perlu dibantu tim lain.',
              },
              {
                title: '3. Follow Up & Evaluasi',
                body: 'Isi langkah berikutnya dan tanggal follow-up. Manager membaca pola kendala dari halaman ini.',
              },
            ].map(item => (
              <div key={item.title} className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm font-extrabold text-foreground">{item.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/reports" className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90">
              Buka Report Harian
              <ArrowRight size={13} />
            </Link>
            <Link href="/expert-queue" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-foreground hover:bg-muted">
              Buka Butuh Dibantu
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}

function InsightTable({
  title,
  subtitle,
  rows,
  empty,
}: {
  title: string
  subtitle: string
  rows: CountRow[]
  empty: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-foreground">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className="text-xs text-muted-foreground">{rows.length} item</span>
      </div>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">{empty}</p>
        ) : rows.map((row, index) => (
          <div key={row.name} className="rounded-xl border border-border bg-slate-50/70 p-3 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{index + 1}. {row.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{row.percent}% dari data terkait</p>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-black text-foreground">{row.count}</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(row.percent, 4)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

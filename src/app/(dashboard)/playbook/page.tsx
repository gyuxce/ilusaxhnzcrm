import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { LaporanSubnav } from '@/components/layout/laporan-subnav'
import { RankedStatList } from '@/components/reports/ranked-stat-list'
import { createClient } from '@/lib/supabase/server'
import {
  AlertTriangle,
  ArrowRight,
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
        title="Alasan tidak lanjut"
        subtitle="Kendala dari chat CRO — untuk keputusan script, offer, dan bantuan tim."
      />

      <div className="w-full space-y-6 p-6 animate-fade-in font-sans">
        <LaporanSubnav />
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            Gagal memuat analisis alasan gagal: {error.message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            { label: 'Total catatan', value: String(total), icon: MessageSquareText },
            { label: 'Kendala terbanyak', value: topObjection?.name || '—', icon: AlertTriangle, small: true },
            { label: 'Perlu dibantu', value: String(expertRows.length), icon: Sparkles },
            { label: 'Bisa berbayar', value: String(potentialPaidRows.length), icon: BriefcaseBusiness },
            { label: 'Ada follow-up', value: String(withFollowUp.length), icon: CheckCircle2 },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold text-muted-foreground">{card.label}</span>
                <card.icon size={15} className="text-accent shrink-0" />
              </div>
              <p
                className={
                  card.small
                    ? 'mt-4 truncate text-sm font-semibold text-foreground'
                    : 'mt-4 font-display text-3xl font-semibold tracking-tight text-foreground tabular-nums'
                }
              >
                {card.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-2xl border border-border bg-card p-5">
            <div className="mb-4">
              <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                Kendala paling sering
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">Dari catatan chat CRO di Kerjaan.</p>
            </div>
            <RankedStatList
              empty="Belum ada catatan kendala."
              rows={objectionRows.map((row) => ({
                name: row.name,
                count: row.count,
                percent: row.percent,
                href: `/reports?date=${new Date().toISOString().split('T')[0]}`,
              }))}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <Lightbulb size={16} className="text-accent" />
              <h2 className="font-display text-base font-semibold tracking-tight text-foreground">
                Catatan keputusan
              </h2>
            </div>
            <div className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                Halaman ini membaca <span className="font-semibold text-foreground">catatan chat</span>, bukan hanya status Not Interested.
              </p>
              <p>
                Pakai <span className="font-semibold text-foreground">Bisa berbayar</span> untuk peluang layanan, dan{' '}
                <span className="font-semibold text-foreground">Perlu dibantu</span> untuk lead yang butuh sensei/tim lain.
              </p>
              <p>Kalau kendala dominan berulang, siapkan script atau offer khusus agar respon tim seragam.</p>
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
              <h2 className="font-display text-base font-semibold tracking-tight text-foreground">Kasus prioritas</h2>
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
            <h2 className="font-display text-base font-semibold tracking-tight text-foreground">Cara pakai buat tim</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              {
                title: '1–3. Kondisi → Kendala → Respon',
                body: 'Di Kerjaan Hari Ini, isi tiga langkah pertama setelah hubungi WA. Satu layar, urutan jelas untuk training.',
              },
              {
                title: '4–5. Next action & follow-up',
                body: 'Pilih langkah berikutnya dan jadwal FU (atau alasan lost). Status terupdate otomatis saat simpan.',
              },
              {
                title: 'Opsi lanjutan',
                body: 'Hasil chat, komersial, dan expert bersifat opsional. Manager membaca pola kendala dari Report Harian.',
              },
            ].map(item => (
              <div key={item.title} className="rounded-xl border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
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
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{rows.length}</span>
      </div>
      <RankedStatList
        empty={empty}
        rows={rows.map((row) => ({
          name: row.name,
          count: row.count,
          percent: row.percent,
        }))}
      />
    </div>
  )
}

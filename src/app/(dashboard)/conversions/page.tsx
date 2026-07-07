import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { CheckSquare, DollarSign, Calendar, MessageCircle } from 'lucide-react'
import { generateWALink } from '@/lib/utils'

type ConversionLead = {
  id: string
  name: string
  phone_number: string
  source?: string
  stage?: string
}

type ConversionRow = {
  id: string
  conversion_type: string
  conversion_date: string
  amount: number | null
  attended_event: boolean | null
  interview_date: string | null
  leads: ConversionLead | null
}

export default async function ConversionsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('conversions')
    .select(`
      *,
      leads(id, name, phone_number, source, stage),
      users!conversions_created_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  const conversions = (data || []) as ConversionRow[]

  const CONV_TYPE: Record<string, { label: string; color: string; bg: string }> = {
    pemetaan: { label: 'Pemetaan', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    full_payment: { label: 'Full Payment', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    dp: { label: 'DP', color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
    webinar_attend: { label: 'Webinar Hadir', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  }

  const totalAmount = conversions.reduce((sum, c) => sum + (c.amount || 0), 0)

  return (
    <>
      <Header title="Konversi" subtitle="Semua leads yang sudah convert" />
      <div className="p-6 animate-fade-in space-y-5">

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Konversi', value: conversions.length.toString(), color: '#22c55e', icon: CheckSquare },
            { label: 'Total Revenue', value: `Rp ${(totalAmount / 1_000_000).toFixed(1)}jt`, color: '#8b5cf6', icon: DollarSign },
            { label: 'Pemetaan', value: conversions.filter(c => c.conversion_type === 'pemetaan').length.toString(), color: '#3b82f6', icon: CheckSquare },
            { label: 'Full Payment', value: conversions.filter(c => c.conversion_type === 'full_payment').length.toString(), color: '#f97316', icon: DollarSign },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-2xl p-4">
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs text-white/40 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(222,47%,14%)' }}>
                  {['Lead', 'Tipe', 'Tanggal', 'Amount', 'Interview', 'Aksi'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white/40">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conversions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-white/30 text-sm">
                      Belum ada konversi. Data akan muncul setelah Supabase terhubung.
                    </td>
                  </tr>
                ) : (
                  conversions.map((conv, i) => {
                    const typeConf = CONV_TYPE[conv.conversion_type] || { label: conv.conversion_type, color: '#64748b', bg: 'rgba(100,116,139,0.1)' }
                    const lead = conv.leads

                    return (
                      <tr
                        key={conv.id}
                        className="hover:bg-white/[0.02] transition-colors group"
                        style={{ borderBottom: i < conversions.length - 1 ? '1px solid hsl(222,47%,11%)' : 'none' }}
                      >
                        <td className="px-4 py-3">
                          <Link href={`/leads/${lead?.id}`} className="font-medium text-white hover:text-purple-300 transition-colors">
                            {lead?.name || 'Tanpa Nama'}
                          </Link>
                          <p className="text-xs text-white/30 font-mono">{lead?.phone_number}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                            style={{ background: typeConf.bg, color: typeConf.color }}>
                            {typeConf.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-white/50">{formatDate(conv.conversion_date)}</td>
                        <td className="px-4 py-3 text-xs font-medium text-green-400">
                          {conv.amount ? `Rp ${conv.amount.toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs text-white/40">
                            {conv.attended_event !== null && (
                              <span>{conv.attended_event ? '✅ Hadir' : '❌ Absen'}</span>
                            )}
                            {conv.interview_date && (
                              <span>{formatDate(conv.interview_date)}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {lead?.phone_number && (
                            <a
                              href={generateWALink(lead.phone_number)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-green-400 hover:bg-green-500/10 transition-all"
                            >
                              <MessageCircle size={14} />
                            </a>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}

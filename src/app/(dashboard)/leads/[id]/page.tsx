import { Header } from '@/components/layout/header'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { generateWALink, formatDate, formatRelativeDate, STAGE_LABELS, SOURCE_LABELS, FU_LABELS, MSG_STATUS_LABELS } from '@/lib/utils'
import { MessageCircle, Clock, CheckCircle2, XCircle, Phone, Edit } from 'lucide-react'
import Link from 'next/link'
import { WhatsAppButton } from '@/components/leads/WhatsAppButton'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const supabase = await createClient()

  const { data: lead } = (await supabase
    .from('leads')
    .select(`
      *,
      users!leads_pic_id_fkey(id, full_name),
      campaigns(id, name)
    `)
    .eq('id', resolvedParams.id)
    .single()) as any

  if (!lead) notFound()

  const { data: followUps } = await supabase
    .from('follow_ups')
    .select('*')
    .eq('lead_id', resolvedParams.id)
    .order('scheduled_date', { ascending: true })

  const { data: activities } = await supabase
    .from('activities')
    .select(`*, users(full_name)`)
    .eq('lead_id', resolvedParams.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const STAGE_COLORS: Record<string, { text: string; bg: string }> = {
    new: { text: '#64748b', bg: 'rgba(100,116,139,0.15)' },
    probing: { text: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
    hot: { text: '#f97316', bg: 'rgba(249,115,22,0.15)' },
    potential: { text: '#eab308', bg: 'rgba(234,179,8,0.15)' },
    converted: { text: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
    rejected: { text: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  }

  const stageColor = STAGE_COLORS[lead.stage] || STAGE_COLORS.new
  const waLink = generateWALink(lead.phone_number)

  return (
    <>
      <Header title={lead.name || 'Detail Lead'} subtitle={lead.phone_number} />
      <div className="p-6 space-y-5 animate-fade-in max-w-5xl">

        {/* Top Row: Profile + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Profile Card */}
          <div className="glass-card rounded-2xl p-5 lg:col-span-2">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0"
                  style={{ background: stageColor.bg, color: stageColor.text }}
                >
                  {(lead.name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{lead.name || 'Tanpa Nama'}</h2>
                  <p className="text-sm text-white/50 font-mono">{lead.phone_number}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                      style={{ background: stageColor.bg, color: stageColor.text, border: `1px solid ${stageColor.text}40` }}
                    >
                      { (STAGE_LABELS as any)[lead.stage] }
                    </span>
                    <span className="text-xs text-white/40 capitalize">
                      {lead.lead_type === 'inbound' ? '📥' : '📤'} {lead.lead_type}
                    </span>
                  </div>
                </div>
              </div>
              <Link href={`/leads/${lead.id}/edit`} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all">
                <Edit size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5">
              {[
                { label: 'Source', value: (SOURCE_LABELS as any)[lead.source] || lead.source },
                { label: 'PIC', value: (lead as any).users?.full_name || '-' },
                { label: 'Campaign', value: (lead as any).campaigns?.name || '-' },
                { label: 'Inbound', value: formatDate(lead.inbound_date) },
                { label: 'Usia', value: lead.age ? `${lead.age} tahun` : '-' },
                { label: 'Pendidikan', value: lead.education?.toUpperCase() || '-' },
                { label: 'Posisi', value: lead.current_position || '-' },
                { label: 'Segment', value: lead.segment || '-' },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-xs text-white/30 mb-0.5">{item.label}</p>
                  <p className="text-sm text-white/80 font-medium truncate">{item.value}</p>
                </div>
              ))}
            </div>

            {lead.notes && (
              <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-xs text-white/30 mb-1">Catatan</p>
                <p className="text-sm text-white/70">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="glass-card rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-white mb-1">Quick Actions</h3>

            <WhatsAppButton
              leadName={lead.name || 'Tanpa Nama'}
              leadPhone={lead.phone_number}
              picName={lead.users?.full_name || undefined}
            />

            <a
              href={`tel:${lead.phone_number}`}
              className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              <Phone size={18} className="text-blue-400" />
              <div>
                <p className="text-sm font-medium text-blue-400">Hubungi</p>
                <p className="text-xs text-white/40">Telepon langsung</p>
              </div>
            </a>

            <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-white/30 mb-1">Terakhir diupdate</p>
              <p className="text-sm text-white/60">{formatRelativeDate(lead.updated_at)}</p>
            </div>
          </div>
        </div>

        {/* Follow-Up Timeline */}
        <div className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock size={15} className="text-purple-400" />
              Timeline Follow-Up
            </h3>
          </div>

          <div className="space-y-3">
            {(followUps || []).length === 0 ? (
              <p className="text-sm text-white/30 text-center py-6">Belum ada follow-up terjadwal</p>
            ) : (
              followUps!.map((fu: any) => (
                <div
                  key={fu.id}
                  className="flex items-start gap-3 p-3 rounded-xl transition-all"
                  style={{ background: fu.is_done ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.03)' }}
                >
                  <div className="mt-0.5">
                    {fu.is_done
                      ? <CheckCircle2 size={16} className="text-green-400" />
                      : fu.scheduled_date && fu.scheduled_date < new Date().toISOString().split('T')[0]
                        ? <XCircle size={16} className="text-red-400" />
                        : <Clock size={16} className="text-white/30" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        {(FU_LABELS as any)[fu.fu_type]}
                        {fu.stage_after && (
                          <span className="ml-2 text-xs text-white/40">→ {(STAGE_LABELS as any)[fu.stage_after]}</span>
                        )}
                      </span>
                      <span className="text-xs text-white/40">
                        {formatDate(fu.actual_date || fu.scheduled_date)}
                      </span>
                    </div>
                    {fu.status_message && (
                      <p className="text-xs text-white/50 mt-0.5">
                        Status: {(MSG_STATUS_LABELS as any)[fu.status_message] || fu.status_message}
                      </p>
                    )}
                    {fu.note && <p className="text-xs text-white/40 mt-1 italic">{fu.note}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Log */}
        {(activities || []).length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Riwayat Aktivitas</h3>
            <div className="space-y-2">
              {activities!.map((act: any) => (
                <div key={act.id} className="flex items-center gap-3 text-xs">
                  <span className="text-white/30 whitespace-nowrap">{formatRelativeDate(act.created_at)}</span>
                  <span className="text-white/60">{act.action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

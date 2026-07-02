'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  MessageCircle, Clock, Calendar, CheckCircle2,
  XCircle, Edit, DollarSign, Activity, FileText,
  UserCheck, AlertCircle, Trash2, ArrowRight, Plus,
  Copy, Sparkles, Target
} from 'lucide-react'
import { WhatsAppModal } from './WhatsAppModal'
import { cn } from '@/lib/utils'
import { LOST_REASON_OPTIONS, LOST_STATUSES } from '@/lib/lost-reasons'
import {
  COMMERCIAL_TYPE_OPTIONS,
  ENTRY_CHANNEL_OPTIONS,
  EXPERT_TYPE_OPTIONS,
  FUNNEL_STATUS_OPTIONS,
  LEAD_CONDITION_OPTIONS,
  LEAD_QUALITY_OPTIONS,
  LEAD_SEGMENT_OPTIONS,
  NEXT_ACTION_OPTIONS,
  OBJECTION_CATEGORY_OPTIONS,
  SOLUTION_OPTIONS,
} from '@/lib/funnel-framework'

interface LeadDetailClientProps {
  initialLead: any
  initialPayments: any[]
  initialPemetaan: any[]
  initialExpertConsultations: any[]
  initialActivities: any[]
  initialFollowUps?: any[]
  initialInterventions?: any[]
  pics: any[]
}

export function LeadDetailClient({
  initialLead,
  initialPayments,
  initialPemetaan,
  initialExpertConsultations,
  initialActivities,
  initialFollowUps,
  initialInterventions,
  pics
}: LeadDetailClientProps) {
  const [lead, setLead] = useState(initialLead)
  const [payments, setPayments] = useState(initialPayments)
  const [pemetaan, setPemetaan] = useState(initialPemetaan[0] || null)
  const [expert, setExpert] = useState(initialExpertConsultations[0] || null)
  const [activities, setActivities] = useState(initialActivities)
  const [followUps, setFollowUps] = useState<any[]>(initialFollowUps || [])
  const [interventions, setInterventions] = useState<any[]>(initialInterventions || [])
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'pemetaan' | 'expert'>('overview')
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null)
  const [paymentMessage, setPaymentMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' })
  const [fuMessage, setFuMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' })
  const [interventionMessage, setInterventionMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' })
  const [showInterventionForm, setShowInterventionForm] = useState(false)
  const [savingIntervention, setSavingIntervention] = useState(false)
  const [copiedRecommendation, setCopiedRecommendation] = useState(false)
  const [interventionForm, setInterventionForm] = useState({
    lead_condition: lead.current_status || '',
    objection_category: lead.lead_segment || '',
    solution_given: '',
    expert_needed: false,
    expert_type: '',
    commercial_type: 'Free',
    service_opportunity: '',
    next_action: lead.next_action || '',
    next_follow_up_date: lead.next_follow_up_date || '',
    result: '',
    notes: '',
  })

  // Follow-Up Form States
  const [showAddFu, setShowAddFu] = useState(false)
  const [newFuDate, setNewFuDate] = useState(new Date().toISOString().split('T')[0])
  const [newFuType, setNewFuType] = useState<'chat' | 'call' | 'whatsapp' | 'meeting'>('whatsapp')
  const [newFuNotes, setNewFuNotes] = useState('')
  const [completingFuId, setCompletingFuId] = useState<string | null>(null)
  const [fuResultInput, setFuResultInput] = useState('')
  
  // WhatsApp Modal
  const [isWaOpen, setIsWaOpen] = useState(false)
  
  // Edit State
  const [isEditingCore, setIsEditingCore] = useState(false)
  const [editName, setEditName] = useState(lead.full_name)
  const [editPhone, setEditPhone] = useState(lead.whatsapp_number)
  const [editEmail, setEditEmail] = useState(lead.email || '')
  const [editSource, setEditSource] = useState(lead.source_campaign)
  const [editStatus, setEditStatus] = useState(lead.current_status)
  const [editPic, setEditPic] = useState(lead.assigned_cro_id || '')
  const [editNotes, setEditNotes] = useState(lead.notes || '')
  const [editLostReason, setEditLostReason] = useState(lead.lost_reason || '')
  const [editLeadQuality, setEditLeadQuality] = useState(lead.lead_quality || '')
  const [editLeadSegment, setEditLeadSegment] = useState(lead.lead_segment || '')
  const [editEntryChannel, setEditEntryChannel] = useState(lead.entry_channel || 'Manual Input')
  const [editNextAction, setEditNextAction] = useState(lead.next_action || '')
  const [editNextFollowUpDate, setEditNextFollowUpDate] = useState(lead.next_follow_up_date || '')
  const [editFunnelNotes, setEditFunnelNotes] = useState(lead.funnel_notes || '')
  const [coreError, setCoreError] = useState('')

  // Form States
  const [paymentType, setPaymentType] = useState('pemetaan')
  const [paymentAmount, setPaymentAmount] = useState('150000')
  const [paymentMethod, setPaymentMethod] = useState('Transfer')
  const [paymentNotes, setPaymentNotes] = useState('')
  
  // Pemetaan form states
  const [formStatus, setFormStatus] = useState(pemetaan?.form_status || 'not_sent')
  const [resultStatus, setResultStatus] = useState(pemetaan?.result_status || 'not_ready')
  const [resultNotes, setResultNotes] = useState(pemetaan?.result_notes || '')
  const [scheduledAt, setScheduledAt] = useState(pemetaan?.scheduled_at ? pemetaan.scheduled_at.slice(0, 16) : '')

  // Expert form states
  const [expertName, setExpertName] = useState(expert?.expert_name || '')
  const [expertScheduled, setExpertScheduled] = useState(expert?.scheduled_at ? expert.scheduled_at.slice(0, 16) : '')
  const [consultResult, setConsultResult] = useState(expert?.consultation_result || '')
  const [consultRecommend, setConsultRecommend] = useState(expert?.recommendation || '')
  const [consultNext, setConsultNext] = useState(expert?.next_step || '')

  const supabase = createClient()

  const updateIntervention = (field: string, value: string | boolean) => {
    setInterventionForm(prev => ({ ...prev, [field]: value }))
  }

  const normalizePhone = (value: string) => {
    let cleanPhone = value.replace(/\D/g, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1)
    } else if (cleanPhone.startsWith('8')) {
      cleanPhone = '62' + cleanPhone
    }
    return cleanPhone
  }

  const userLabel = (user: any, fallback?: string | null) => {
    if (user?.name) return user.name
    if (fallback) return fallback
    return '-'
  }

  const friendlyDuplicateError = (err?: any) => {
    if (err?.duplicate_lead) {
      const duplicate = err.duplicate_lead
      return `Nomor WhatsApp ini sudah terdaftar untuk ${duplicate.full_name} (${duplicate.source_campaign || 'tanpa campaign'}) dengan status ${duplicate.current_status || '-'}.`
    }

    const isDuplicate =
      err?.code === '23505' ||
      err?.message?.includes('leads_whatsapp_normalized_unique') ||
      err?.message?.toLowerCase?.().includes('duplicate key')

    return isDuplicate
      ? 'Nomor WhatsApp ini sudah terdaftar. Cari nomor tersebut di menu Leads untuk membuka data existing.'
      : err?.message || 'Terjadi kesalahan saat menyimpan data lead.'
  }

  const formatShortDate = (value?: string | null) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    })
  }

  const latestIntervention = interventions[0] || null

  const buildRecommendedAction = (item?: any) => {
    if (!item) {
      return {
        title: 'Lead belum punya handling log',
        body: 'Isi Objection & Intervention Log setelah CRO menghubungi lead agar aktivitas masuk Team Report dan Reason Penolakan.',
        nextAction: 'Tambah Intervention Log',
        tone: 'amber',
      }
    }

    const objection = String(item.objection_category || '').toLowerCase()
    const solution = item.solution_given || 'Gunakan solusi/intervensi yang paling relevan.'
    const needsExpert = item.expert_needed || item.expert_type
    const potentialPaid = String(item.commercial_type || '').toLowerCase().includes('paid')

    if (needsExpert) {
      return {
        title: `Butuh ${item.expert_type || 'Expert'}`,
        body: `Lead sudah ditandai butuh expert. Pastikan konteks objection (${item.objection_category || '-'}) dan solusi (${solution}) siap sebelum masuk Expert Queue.`,
        nextAction: item.next_action || 'Jadwalkan Expert',
        tone: 'violet',
      }
    }

    if (potentialPaid) {
      return {
        title: 'Potential Paid Service',
        body: `Validasi kebutuhan lead, jelaskan value layanan, lalu follow up dengan offer yang spesifik. Opportunity: ${item.service_opportunity || 'belum diisi'}.`,
        nextAction: item.next_action || 'Follow Up Offer',
        tone: 'blue',
      }
    }

    if (objection.includes('budget') || objection.includes('biaya') || objection.includes('uang')) {
      return {
        title: 'Objection Budget / Biaya',
        body: 'Fokuskan follow-up pada value program, bukti hasil, risiko kalau menunda, dan opsi pembayaran/tahapan biaya bila memungkinkan.',
        nextAction: item.next_action || 'Follow Up Value',
        tone: 'emerald',
      }
    }

    if (objection.includes('waktu') || objection.includes('sibuk')) {
      return {
        title: 'Objection Waktu',
        body: 'Tawarkan slot follow-up yang spesifik dan ringkas. Gunakan pesan pendek yang langsung menjawab benefit utama untuk lead ini.',
        nextAction: item.next_action || 'Follow Up Jadwal',
        tone: 'orange',
      }
    }

    if (objection.includes('ragu') || objection.includes('trust') || objection.includes('percaya')) {
      return {
        title: 'Objection Trust / Keraguan',
        body: 'Kirim social proof, alur program, testimoni, dan ajak konsultasi singkat agar keraguannya bisa dipetakan lebih jelas.',
        nextAction: item.next_action || 'Kirim Social Proof',
        tone: 'violet',
      }
    }

    return {
      title: item.objection_category ? `Objection: ${item.objection_category}` : 'Handling Terakhir Tercatat',
      body: `Solusi terakhir: ${solution}. Lanjutkan follow-up berdasarkan next action dan update result setelah ada respon.`,
      nextAction: item.next_action || 'Follow Up',
      tone: 'slate',
    }
  }

  const recommendedAction = buildRecommendedAction(latestIntervention)

  const recommendationText = [
    `Lead: ${lead.full_name}`,
    `Status: ${lead.current_status}`,
    latestIntervention ? `Kondisi: ${latestIntervention.lead_condition || '-'}` : 'Kondisi: belum ada handling log',
    latestIntervention ? `Objection: ${latestIntervention.objection_category || '-'}` : 'Objection: -',
    latestIntervention ? `Solusi: ${latestIntervention.solution_given || '-'}` : 'Solusi: -',
    `Rekomendasi: ${recommendedAction.body}`,
    `Next action: ${recommendedAction.nextAction}`,
    latestIntervention?.next_follow_up_date ? `Next FU: ${formatShortDate(latestIntervention.next_follow_up_date)}` : null,
  ].filter(Boolean).join('\n')

  const copyRecommendation = async () => {
    await navigator.clipboard.writeText(recommendationText)
    setCopiedRecommendation(true)
    setTimeout(() => setCopiedRecommendation(false), 1800)
  }

  // Log Activity Helper
  const logActivity = async (type: string, desc: string, userId?: string | null) => {
    const actorId = userId === undefined
      ? (await supabase.auth.getUser()).data.user?.id || null
      : userId

    const { data: newAct, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: lead.id,
        activity_type: type,
        description: desc,
        created_by: actorId
      })
      .select()
    if (!error && newAct) {
      setActivities(prev => [newAct[0], ...prev])
    }
  }

  // Handle scheduling follow-up
  const handleAddFollowUp = async () => {
    if (!newFuDate) return
    setFuMessage({ text: '', type: '' })
    const { data: authData } = await supabase.auth.getUser()
    const actorId = authData.user?.id || null

    const { data: newFu, error } = await supabase
      .from('follow_ups')
      .insert({
        lead_id: lead.id,
        scheduled_date: newFuDate,
        fu_type: newFuType,
        notes: newFuNotes || null,
        pic_id: actorId,
      })
      .select('*, users:pic_id(id, name)')

    if (error) {
      setFuMessage({ text: 'Gagal menjadwalkan follow-up: ' + error.message, type: 'error' })
      return
    }

    if (newFu && newFu.length > 0) {
      setFollowUps(prev => [...prev, newFu[0]].sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()))
      setFuMessage({ text: 'Jadwal follow-up berhasil disimpan!', type: 'success' })
      setTimeout(() => setFuMessage({ text: '', type: '' }), 4500)
    }

    // Log to lead_activities
    await logActivity(
      'Follow-Up Scheduled',
      `Jadwalkan follow-up (${newFuType}) untuk tanggal ${newFuDate}`,
      actorId
    )

    // Update lead's updated_at/updated_by
    await supabase.from('leads').update({
      updated_at: new Date().toISOString(),
      updated_by: actorId
    }).eq('id', lead.id)

    setShowAddFu(false)
    setNewFuNotes('')
  }

  // Handle completing follow-up
  const handleCompleteFollowUp = async (fuId: string, fuType: string) => {
    setFuMessage({ text: '', type: '' })
    const result = fuResultInput || 'Selesai'
    const { data: authData } = await supabase.auth.getUser()
    const actorId = authData.user?.id || null

    const { error } = await supabase
      .from('follow_ups')
      .update({
        is_done: true,
        done_at: new Date().toISOString(),
        result: result,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fuId)

    if (error) {
      setFuMessage({ text: 'Gagal menyelesaikan follow-up: ' + error.message, type: 'error' })
      return
    }

    setFollowUps(prev => prev.map(f => f.id === fuId ? { ...f, is_done: true, result } : f))
    setCompletingFuId(null)
    setFuResultInput('')
    setFuMessage({ text: 'Follow-up berhasil diselesaikan!', type: 'success' })
    setTimeout(() => setFuMessage({ text: '', type: '' }), 4500)

    // Log to lead_activities
    await logActivity(
      'Follow-Up Completed',
      `Follow-up (${fuType}) selesai: ${result}`,
      actorId
    )

    // Update lead's updated_at/updated_by
    await supabase.from('leads').update({
      updated_at: new Date().toISOString(),
      updated_by: actorId
    }).eq('id', lead.id)
  }

  const handleAddIntervention = async () => {
    setInterventionMessage({ text: '', type: '' })

    if (!interventionForm.lead_condition || !interventionForm.objection_category || !interventionForm.solution_given) {
      setInterventionMessage({ text: 'Kondisi lead, objection, dan solusi wajib diisi.', type: 'error' })
      return
    }

    setSavingIntervention(true)
    const { data: authData } = await supabase.auth.getUser()
    const actorId = authData.user?.id || null

    const payload = {
      lead_id: lead.id,
      created_by: actorId,
      lead_condition: interventionForm.lead_condition,
      objection_category: interventionForm.objection_category,
      solution_given: interventionForm.solution_given,
      expert_needed: interventionForm.expert_needed,
      expert_type: interventionForm.expert_needed ? interventionForm.expert_type || null : null,
      commercial_type: interventionForm.commercial_type,
      service_opportunity: interventionForm.service_opportunity || null,
      next_action: interventionForm.next_action || null,
      next_follow_up_date: interventionForm.next_follow_up_date || null,
      result: interventionForm.result || null,
      notes: interventionForm.notes || null,
    }

    const { data, error } = await supabase
      .from('lead_interventions')
      .insert(payload)
      .select('*, users:created_by(id, name)')

    setSavingIntervention(false)

    if (error) {
      setInterventionMessage({ text: 'Gagal menyimpan intervention log: ' + error.message, type: 'error' })
      return
    }

    if (data?.[0]) {
      setInterventions(prev => [data[0], ...prev])
      setInterventionMessage({ text: 'Intervention log berhasil disimpan.', type: 'success' })
      setTimeout(() => setInterventionMessage({ text: '', type: '' }), 4500)
      setShowInterventionForm(false)

      const leadUpdates = {
        lead_segment: interventionForm.objection_category || lead.lead_segment || null,
        next_action: interventionForm.next_action || lead.next_action || null,
        next_follow_up_date: interventionForm.next_follow_up_date || lead.next_follow_up_date || null,
        funnel_notes: interventionForm.notes || lead.funnel_notes || null,
        updated_by: actorId,
        updated_at: new Date().toISOString(),
      }

      await supabase.from('leads').update(leadUpdates).eq('id', lead.id)
      setLead((prev: any) => ({ ...prev, ...leadUpdates }))

      await logActivity(
        'Intervention Logged',
        `${interventionForm.lead_condition} | Objection: ${interventionForm.objection_category} | Solusi: ${interventionForm.solution_given}`,
        actorId
      )

      setInterventionForm({
        lead_condition: interventionForm.next_action || lead.current_status || '',
        objection_category: '',
        solution_given: '',
        expert_needed: false,
        expert_type: '',
        commercial_type: 'Free',
        service_opportunity: '',
        next_action: '',
        next_follow_up_date: '',
        result: '',
        notes: '',
      })
    }
  }

  // Save Core Lead Data
  const handleSaveCore = async () => {
    setCoreError('')

    if (!editName.trim()) {
      setCoreError('Nama Lengkap wajib diisi.')
      return
    }

    const cleanPhone = normalizePhone(editPhone)

    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      setCoreError('Nomor WhatsApp tidak valid (harus antara 9 sampai 15 digit angka).')
      return
    }

    const { data, error } = await supabase.rpc('update_lead_core_fast', {
      p_lead_id: lead.id,
      p_full_name: editName,
      p_whatsapp_number: cleanPhone,
      p_email: editEmail || null,
      p_source_campaign: editSource,
      p_current_status: editStatus,
      p_assigned_cro_id: editPic || null,
      p_notes: editNotes || null,
      p_lost_reason: LOST_STATUSES.includes(editStatus) ? editLostReason : null,
    })

    if (error) {
      setCoreError(error.message || 'Terjadi kesalahan saat menyimpan data lead.')
      return
    }

    if (!data?.ok) {
      setCoreError(friendlyDuplicateError(data))
      return
    }

    const funnelPayload = {
      lead_quality: editLeadQuality || null,
      lead_segment: editLeadSegment || null,
      entry_channel: editEntryChannel || null,
      next_action: editNextAction || null,
      next_follow_up_date: editNextFollowUpDate || null,
      funnel_notes: editFunnelNotes || null,
      lost_reason: LOST_STATUSES.includes(editStatus) ? editLostReason || null : null,
    }

    const { error: funnelError } = await supabase
      .from('leads')
      .update(funnelPayload)
      .eq('id', lead.id)

    if (funnelError) {
      setCoreError(`Data utama tersimpan, tapi funnel mapping gagal: ${funnelError.message}`)
      return
    }

    const updatedAt = new Date().toISOString()
    const updatedLead = {
      ...lead,
      full_name: editName,
      whatsapp_number: cleanPhone,
      whatsapp_normalized: cleanPhone,
      email: editEmail || null,
      source_campaign: editSource,
      current_status: editStatus,
      assigned_cro_id: editPic || null,
      notes: editNotes || null,
      lost_reason: LOST_STATUSES.includes(editStatus) ? editLostReason : null,
      ...funnelPayload,
      updated_at: updatedAt
    }
    setLead(updatedLead)
    setEditPhone(cleanPhone)
    setIsEditingCore(false)
    setActivities(prev => [{
      id: `local-${updatedAt}`,
      lead_id: lead.id,
      activity_type: 'Lead Updated',
      description: 'Core lead information updated manually',
      created_at: updatedAt,
    }, ...prev])
  }

  // Add Payment
  const handleAddPayment = async () => {
    setPaymentMessage({ text: '', type: '' })
    const { data, error } = await supabase
      .from('payments')
      .insert({
        lead_id: lead.id,
        payment_type: paymentType,
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        payment_date: new Date().toISOString().split('T')[0],
        verification_status: 'verified', // automatically verify for manual add
        verified_at: new Date().toISOString(),
        notes: paymentNotes
      })
      .select()

    if (error) {
      setPaymentMessage({ text: 'Gagal menambah pembayaran: ' + error.message, type: 'error' })
      return
    }

    if (data) {
      setPayments(prev => [...prev, data[0]])
      setPaymentNotes('')
      setPaymentMessage({ text: `Pembayaran ${paymentType} senilai Rp ${Number(paymentAmount).toLocaleString('id-ID')} berhasil disimpan dan diverifikasi!`, type: 'success' })
      setTimeout(() => setPaymentMessage({ text: '', type: '' }), 5000)
      logActivity('Payment Added', `Added ${paymentType} payment: Rp ${Number(paymentAmount).toLocaleString('id-ID')}`)
    }
  }

  const handleDeletePayment = async (payment: any) => {
    setPaymentMessage({ text: '', type: '' })
    const confirmed = window.confirm(`Hapus payment ${payment.payment_type} senilai Rp ${Number(payment.amount).toLocaleString('id-ID')}?`)
    if (!confirmed) return

    setDeletingPaymentId(payment.id)
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', payment.id)

    setDeletingPaymentId(null)

    if (!error) {
      setPayments(prev => prev.filter(p => p.id !== payment.id))
      setPaymentMessage({ text: 'Catatan pembayaran berhasil dihapus.', type: 'success' })
      setTimeout(() => setPaymentMessage({ text: '', type: '' }), 4000)
      logActivity('Payment Deleted', `Deleted ${payment.payment_type} payment: Rp ${Number(payment.amount).toLocaleString('id-ID')}`)
    } else {
      setPaymentMessage({ text: 'Gagal menghapus payment: ' + error.message, type: 'error' })
    }
  }

  // Save Pemetaan
  const handleSavePemetaan = async () => {
    const fields = {
      form_status: formStatus,
      result_status: resultStatus,
      result_notes: resultNotes || null,
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      updated_at: new Date().toISOString()
    }

    if (pemetaan) {
      const { error } = await supabase
        .from('pemetaan')
        .update(fields)
        .eq('id', pemetaan.id)
      if (!error) {
        setPemetaan({ ...pemetaan, ...fields })
        logActivity('Pemetaan Updated', 'Pemetaan status and results updated')
      }
    } else {
      const { data, error } = await supabase
        .from('pemetaan')
        .insert({ lead_id: lead.id, ...fields })
        .select()
      if (!error && data) {
        setPemetaan(data[0])
        logActivity('Pemetaan Created', 'Pemetaan module initialised')
      }
    }
  }

  // Save Expert Consultation
  const handleSaveExpert = async () => {
    const fields = {
      expert_name: expertName || null,
      scheduled_at: expertScheduled ? new Date(expertScheduled).toISOString() : null,
      consultation_result: consultResult || null,
      recommendation: consultRecommend || null,
      next_step: consultNext || null,
      updated_at: new Date().toISOString()
    }

    if (expert) {
      const { error } = await supabase
        .from('expert_consultations')
        .update(fields)
        .eq('id', expert.id)
      if (!error) {
        setExpert({ ...expert, ...fields })
        logActivity('Expert Consultation Updated', 'Expert consultation details updated')
      }
    } else {
      const { data, error } = await supabase
        .from('expert_consultations')
        .insert({ lead_id: lead.id, ...fields })
        .select()
      if (!error && data) {
        setExpert(data[0])
        logActivity('Expert Consultation Created', 'Expert consultation module initialised')
      }
    }
  }

  return (
    <div className="w-full p-6 space-y-6">
      
      {/* Top Banner: Name & Quick WA Link */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 glass-card rounded-2xl border border-border relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-650 dark:text-purple-400 flex items-center justify-center font-bold text-xl glow-purple border border-purple-500/10">
            {lead.full_name[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">{lead.full_name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{lead.whatsapp_number} | PIC: {pics.find(p => p.id === lead.assigned_cro_id)?.name || 'Belum di-assign'}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/20 text-purple-650 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30">
                {lead.current_status}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/work-queue?lead=${lead.id}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:opacity-90 transition-all cursor-pointer shadow-sm"
          >
            <ArrowRight size={14} />
            Kerjakan di Work Queue
          </Link>
          <Link
            href={`/leads/${lead.id}/edit`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-white/70 bg-slate-100 dark:bg-white/5 border border-border hover:bg-slate-200/50 dark:hover:bg-white/10 transition-all cursor-pointer"
          >
            <Edit size={14} />
            Edit Data
          </Link>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Tab Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tab 1: Overview */}
          {true && (
            <div className="glass-card rounded-2xl p-6 border border-border space-y-6">
              <h3 className="text-foreground font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-purple-650 dark:text-purple-400" />
                Detail Informasi Lead
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Nama Lengkap', value: lead.full_name },
                  { label: 'WhatsApp', value: lead.whatsapp_number },
                  { label: 'Email', value: lead.email || '-' },
                  { label: 'Source Campaign', value: lead.source_campaign },
                  { label: 'Status Pipeline', value: lead.current_status },
                  { label: 'Lead Quality', value: lead.lead_quality || '-' },
                  { label: 'Lead Segment', value: lead.lead_segment || '-' },
                  { label: 'Entry Channel', value: lead.entry_channel || '-' },
                  { label: 'Next Action', value: lead.next_action || '-' },
                  { label: 'Next Follow-Up', value: lead.next_follow_up_date ? new Date(lead.next_follow_up_date).toLocaleDateString('id-ID') : '-' },
                  { label: 'Lost Reason', value: lead.lost_reason || '-' },
                  { label: 'Tanggal Masuk', value: new Date(lead.lead_entry_date).toLocaleString('id-ID') },
                  { label: 'Terakhir Dihubungi', value: lead.last_contacted_date ? new Date(lead.last_contacted_date).toLocaleString('id-ID') : '-' },
                  { label: 'Dibuat Oleh', value: userLabel(lead.created_by_user, lead.created_by) },
                  { label: 'Diupdate Oleh', value: userLabel(lead.updated_by_user, lead.updated_by) },
                  { label: 'Terakhir Diupdate', value: lead.updated_at ? new Date(lead.updated_at).toLocaleString('id-ID') : '-' }
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl border border-border bg-slate-50/50 dark:bg-white/[0.01]">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">{item.label}</span>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white/80 mt-1">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-white/[0.01]">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Catatan / Keterangan</span>
                <p className="text-xs text-slate-700 dark:text-white/60 mt-2 leading-relaxed whitespace-pre-wrap">{lead.notes || 'Tidak ada catatan.'}</p>
              </div>

              <div className="p-4 rounded-xl border border-border bg-emerald-500/5">
                <span className="text-[10px] text-muted-foreground font-bold uppercase">Funnel Notes</span>
                <p className="text-xs text-slate-700 dark:text-white/60 mt-2 leading-relaxed whitespace-pre-wrap">{lead.funnel_notes || 'Belum ada catatan funnel.'}</p>
              </div>
            </div>
          )}

          {/* Tab 2: Payments */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              {/* Payment Log */}
              <div className="glass-card rounded-2xl p-6 border border-border space-y-4">
                <h3 className="text-foreground font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
                  Riwayat Pembayaran
                </h3>

                <div className="space-y-3">
                  {payments.length === 0 ? (
                    <p className="text-muted-foreground/50 text-xs text-center py-6">Belum ada catatan pembayaran.</p>
                  ) : (
                    payments.map(p => (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-slate-50/50 dark:bg-white/[0.01]">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-foreground uppercase">{p.payment_type}</span>
                          <p className="text-[10px] text-muted-foreground">Tanggal: {p.payment_date} | Metode: {p.payment_method}</p>
                          {p.notes && <p className="text-[11px] text-muted-foreground italic">Catatan: {p.notes}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                          <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">Rp {Number(p.amount).toLocaleString('id-ID')}</p>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                            VERIFIED
                          </span>
                          </div>
                          <button
                            onClick={() => handleDeletePayment(p)}
                            disabled={deletingPaymentId === p.id}
                            className="rounded-lg border border-red-500/15 bg-red-500/10 p-2 text-red-500 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Hapus payment"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Add Payment Form */}
              <div className="glass-card rounded-2xl p-6 border border-border space-y-4">
                <h3 className="text-foreground font-bold text-xs uppercase tracking-wider">Catat Pembayaran Baru</h3>
                
                {paymentMessage.text && (
                  <div className={cn(
                    "p-3.5 rounded-xl text-xs font-bold border",
                    paymentMessage.type === 'success'
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                      : "bg-red-50 border-red-100 text-red-750 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
                  )}>
                    {paymentMessage.text}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1">Tipe Pembayaran</label>
                    <select
                      value={paymentType}
                      onChange={e => setPaymentType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                    >
                      <option value="pemetaan">Pemetaan / Roadmap Session</option>
                      <option value="seat_lock">Seat Lock</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1">Nominal Pembayaran</label>
                    <input
                      type="number"
                      value={paymentAmount}
                      onChange={e => setPaymentAmount(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1">Catatan Tambahan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Transfer Bank BCA an. Budi..."
                    value={paymentNotes}
                    onChange={e => setPaymentNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <button
                  onClick={handleAddPayment}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white hover:glow-purple transition-all duration-300 cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
                >
                  Simpan & Verifikasi Pembayaran
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Pemetaan */}
          {activeTab === 'pemetaan' && (
            <div className="glass-card rounded-2xl p-6 border border-border space-y-6">
              <h3 className="text-foreground font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-purple-650 dark:text-purple-400" />
                Modul Pemetaan / Roadmap Session
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Status Pengisian Form</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="not_sent">Belum Dikirim</option>
                    <option value="sent">Sudah Dikirim</option>
                    <option value="submitted">Sudah Diisi (Submitted)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Jadwal Pemetaan</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-4 border-t border-border">
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Status Hasil Pemetaan</label>
                  <select
                    value={resultStatus}
                    onChange={e => setResultStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                  >
                    <option value="not_ready">Belum Siap</option>
                    <option value="waiting">Menunggu Hasil</option>
                    <option value="ready">Hasil Siap (Result Ready)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Catatan / Link Hasil Pemetaan</label>
                  <textarea
                    placeholder="Hasil pemetaan, rekomendasi jalur program, dll..."
                    value={resultNotes}
                    onChange={e => setResultNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none h-24 focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <button
                onClick={handleSavePemetaan}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white hover:glow-purple transition-all duration-300 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
              >
                Simpan Progress Pemetaan
              </button>
            </div>
          )}

          {/* Tab 4: Expert Consultation */}
          {activeTab === 'expert' && (
            <div className="glass-card rounded-2xl p-6 border border-border space-y-6">
              <h3 className="text-foreground font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                <UserCheck size={16} className="text-purple-650 dark:text-purple-400" />
                Modul Konsultasi Expert
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Nama Expert / Konsultan</label>
                  <input
                    type="text"
                    placeholder="Nama expert..."
                    value={expertName}
                    onChange={e => setExpertName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Jadwal Konsultasi</label>
                  <input
                    type="datetime-local"
                    value={expertScheduled}
                    onChange={e => setExpertScheduled(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Hasil Konsultasi</label>
                  <input
                    type="text"
                    placeholder="Contoh: Tertarik Jepang Regular, bersedia DP..."
                    value={consultResult}
                    onChange={e => setConsultResult(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Rekomendasi Jalur</label>
                  <input
                    type="text"
                    placeholder="Jalur Regular, Konstruksi, dll..."
                    value={consultRecommend}
                    onChange={e => setConsultRecommend(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-muted-foreground font-bold uppercase mb-1.5">Langkah Selanjutnya (Next Step)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Follow up seat lock nominal 3jt..."
                    value={consultNext}
                    onChange={e => setConsultNext(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs text-foreground bg-card border border-border outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveExpert}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white hover:glow-purple transition-all duration-300 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
              >
                Simpan Progress Konsultasi Expert
              </button>
            </div>
          )}

        </div>

        {/* Right 1 Column: Activity Log */}
        <div className="space-y-6">
          {/* Decision Helper */}
          <div className={cn(
            "rounded-2xl border p-5 shadow-xs space-y-4",
            recommendedAction.tone === 'amber' && "border-amber-200 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/[0.06]",
            recommendedAction.tone === 'violet' && "border-violet-200 bg-violet-50/70 dark:border-violet-500/20 dark:bg-violet-500/[0.06]",
            recommendedAction.tone === 'blue' && "border-blue-200 bg-blue-50/70 dark:border-blue-500/20 dark:bg-blue-500/[0.06]",
            recommendedAction.tone === 'emerald' && "border-emerald-200 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/[0.06]",
            recommendedAction.tone === 'orange' && "border-orange-200 bg-orange-50/70 dark:border-orange-500/20 dark:bg-orange-500/[0.06]",
            recommendedAction.tone === 'slate' && "border-border bg-card"
          )}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={14} className="text-primary" />
                  Decision Helper
                </h3>
                <p className="mt-1 text-[10px] text-muted-foreground">Arahan otomatis dari handling/intervention terakhir.</p>
              </div>
              <button
                type="button"
                onClick={copyRecommendation}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] font-bold text-foreground hover:bg-muted transition-all"
              >
                {copiedRecommendation ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                {copiedRecommendation ? 'Tersalin' : 'Copy'}
              </button>
            </div>

            <div className="rounded-xl border border-border/70 bg-card/80 p-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Target size={15} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-foreground">{recommendedAction.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{recommendedAction.body}</p>
                </div>
              </div>
            </div>

            {latestIntervention ? (
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="rounded-xl border border-border/70 bg-card/70 p-2.5">
                  <p className="font-black uppercase text-muted-foreground">Kondisi</p>
                  <p className="mt-1 font-semibold text-foreground">{latestIntervention.lead_condition || '-'}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/70 p-2.5">
                  <p className="font-black uppercase text-muted-foreground">Objection</p>
                  <p className="mt-1 font-semibold text-foreground">{latestIntervention.objection_category || '-'}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/70 p-2.5">
                  <p className="font-black uppercase text-muted-foreground">Next Action</p>
                  <p className="mt-1 font-semibold text-foreground">{latestIntervention.next_action || '-'}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-card/70 p-2.5">
                  <p className="font-black uppercase text-muted-foreground">Next FU</p>
                  <p className="mt-1 font-semibold text-foreground">{formatShortDate(latestIntervention.next_follow_up_date)}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-amber-300/70 bg-card/60 p-3 text-xs leading-relaxed text-muted-foreground dark:border-amber-500/25">
                Lead ini belum punya handling log. Kerjakan lead ini dari Work Queue agar data masuk ke Team Report dan Reason Penolakan.
              </div>
            )}

            <Link
              href={`/work-queue?lead=${lead.id}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-all"
            >
              <ArrowRight size={13} />
              Buka di Work Queue
            </Link>
          </div>

          {/* Objection & Intervention Log */}
          <div className="glass-card rounded-2xl p-5 border border-border space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <AlertCircle size={14} className="text-orange-500" />
                Objection & Intervention ({interventions.length})
              </h3>
              <Link
                href={`/work-queue?lead=${lead.id}`}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/15 transition-all"
              >
                Work Queue
              </Link>
            </div>

            {interventionMessage.text && (
              <div className={cn(
                "p-3 rounded-xl text-xs font-bold border",
                interventionMessage.type === 'success'
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                  : "bg-red-50 border-red-100 text-red-750 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
              )}>
                {interventionMessage.text}
              </div>
            )}

            {showInterventionForm && (
              <div className="p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-white/[0.02] space-y-3">
                <div>
                  <label className="block text-[9px] text-muted-foreground font-bold uppercase mb-1">Kondisi Lead</label>
                  <select
                    value={interventionForm.lead_condition}
                    onChange={e => updateIntervention('lead_condition', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg outline-none"
                  >
                    <option value="">Pilih kondisi</option>
                    {LEAD_CONDITION_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-muted-foreground font-bold uppercase mb-1">Objection</label>
                  <select
                    value={interventionForm.objection_category}
                    onChange={e => updateIntervention('objection_category', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg outline-none"
                  >
                    <option value="">Pilih objection</option>
                    {OBJECTION_CATEGORY_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] text-muted-foreground font-bold uppercase mb-1">Solusi / Intervensi</label>
                  <select
                    value={interventionForm.solution_given}
                    onChange={e => updateIntervention('solution_given', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg outline-none"
                  >
                    <option value="">Pilih solusi</option>
                    {SOLUTION_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-muted-foreground font-bold uppercase mb-1">Free / Paid</label>
                    <select
                      value={interventionForm.commercial_type}
                      onChange={e => updateIntervention('commercial_type', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg outline-none"
                    >
                      {COMMERCIAL_TYPE_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-muted-foreground font-bold uppercase mb-1">Butuh Expert</label>
                    <select
                      value={interventionForm.expert_needed ? 'yes' : 'no'}
                      onChange={e => updateIntervention('expert_needed', e.target.value === 'yes')}
                      className="w-full px-2.5 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg outline-none"
                    >
                      <option value="no">Tidak</option>
                      <option value="yes">Ya</option>
                    </select>
                  </div>
                </div>

                {interventionForm.expert_needed && (
                  <div>
                    <label className="block text-[9px] text-muted-foreground font-bold uppercase mb-1">Tipe Expert</label>
                    <select
                      value={interventionForm.expert_type}
                      onChange={e => updateIntervention('expert_type', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg outline-none"
                    >
                      <option value="">Pilih expert</option>
                      {EXPERT_TYPE_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[9px] text-muted-foreground font-bold uppercase mb-1">Service Opportunity</label>
                  <input
                    value={interventionForm.service_opportunity}
                    onChange={e => updateIntervention('service_opportunity', e.target.value)}
                    placeholder="Contoh: kelas bahasa, document support, career mapping..."
                    className="w-full px-2.5 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] text-muted-foreground font-bold uppercase mb-1">Next Action</label>
                    <select
                      value={interventionForm.next_action}
                      onChange={e => updateIntervention('next_action', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg outline-none"
                    >
                      <option value="">Pilih next action</option>
                      {NEXT_ACTION_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] text-muted-foreground font-bold uppercase mb-1">Next FU</label>
                    <input
                      type="date"
                      value={interventionForm.next_follow_up_date}
                      onChange={e => updateIntervention('next_follow_up_date', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] text-muted-foreground font-bold uppercase mb-1">Result</label>
                  <input
                    value={interventionForm.result}
                    onChange={e => updateIntervention('result', e.target.value)}
                    placeholder="Contoh: waiting response, expert needed, ready closing..."
                    className="w-full px-2.5 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] text-muted-foreground font-bold uppercase mb-1">Notes</label>
                  <textarea
                    value={interventionForm.notes}
                    onChange={e => updateIntervention('notes', e.target.value)}
                    rows={2}
                    placeholder="Detail handling singkat..."
                    className="w-full px-2.5 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg resize-none outline-none"
                  />
                </div>

                <button
                  onClick={handleAddIntervention}
                  disabled={savingIntervention}
                  className="w-full py-1.5 rounded-lg text-xs font-bold text-white bg-orange-500 hover:opacity-90 transition-all cursor-pointer disabled:opacity-60"
                >
                  {savingIntervention ? 'Menyimpan...' : 'Simpan Intervention Log'}
                </button>
              </div>
            )}

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {interventions.length === 0 ? (
                <p className="text-muted-foreground/50 text-[10px] py-4 text-center">Belum ada intervention log.</p>
              ) : interventions.map(item => (
                <div key={item.id} className="rounded-xl border border-border bg-card p-3 text-xs space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-foreground">{item.lead_condition || '-'}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(item.created_at).toLocaleString('id-ID')} {item.users?.name ? `oleh ${item.users.name}` : ''}
                      </p>
                    </div>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[9px] font-black',
                      item.commercial_type === 'Paid' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' :
                      item.commercial_type === 'Potential Paid' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300' :
                      'bg-slate-500/10 text-muted-foreground'
                    )}>
                      {item.commercial_type || 'Free'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-[10px] text-muted-foreground">
                    <p><strong className="text-foreground">Objection:</strong> {item.objection_category || '-'}</p>
                    <p><strong className="text-foreground">Solusi:</strong> {item.solution_given || '-'}</p>
                    <p><strong className="text-foreground">Next:</strong> {item.next_action || '-'}{item.next_follow_up_date ? ` (${new Date(item.next_follow_up_date).toLocaleDateString('id-ID')})` : ''}</p>
                    {item.expert_needed && <p><strong className="text-foreground">Expert:</strong> {item.expert_type || 'Ya'}</p>}
                    {item.service_opportunity && <p><strong className="text-foreground">Opportunity:</strong> {item.service_opportunity}</p>}
                    {item.result && <p><strong className="text-foreground">Result:</strong> {item.result}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Follow-Up Tracker */}
          <div className="glass-card rounded-2xl p-5 border border-border space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <Calendar size={14} className="text-purple-650 dark:text-purple-400" />
                Jadwal Follow-Up ({followUps.filter(f => !f.is_done).length})
              </h3>
              <Link
                href={`/work-queue?lead=${lead.id}`}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/15 transition-all"
              >
                Work Queue
              </Link>
            </div>

            {fuMessage.text && (
              <div className={cn(
                "p-3 rounded-xl text-xs font-bold border",
                fuMessage.type === 'success'
                  ? "bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400"
                  : "bg-red-50 border-red-100 text-red-750 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400"
              )}>
                {fuMessage.text}
              </div>
            )}

            {showAddFu && (
              <div className="p-3.5 rounded-xl border border-border bg-slate-50/50 dark:bg-white/[0.02] space-y-3">
                <p className="text-[10px] font-bold text-slate-700 dark:text-white/60">JADWALKAN FU BARU</p>
                <div>
                  <label className="block text-[9px] text-muted-foreground font-bold uppercase mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={newFuDate}
                    onChange={e => setNewFuDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-muted-foreground font-bold uppercase mb-1">Tipe</label>
                  <select
                    value={newFuType}
                    onChange={e => setNewFuType(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg outline-none cursor-pointer"
                  >
                    <option value="whatsapp" className="bg-card text-foreground">🟢 WhatsApp</option>
                    <option value="chat" className="bg-card text-foreground">💬 Chat</option>
                    <option value="call" className="bg-card text-foreground">📞 Telepon</option>
                    <option value="meeting" className="bg-card text-foreground">🤝 Meeting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-muted-foreground font-bold uppercase mb-1">Catatan</label>
                  <textarea
                    placeholder="Catatan..."
                    value={newFuNotes}
                    onChange={e => setNewFuNotes(e.target.value)}
                    rows={2}
                    className="w-full px-2.5 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg resize-none outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                  />
                </div>
                <button
                  onClick={handleAddFollowUp}
                  className="w-full py-1.5 rounded-lg text-xs font-bold text-white bg-purple-500 hover:opacity-90 transition-all cursor-pointer"
                >
                  Simpan Jadwal
                </button>
              </div>
            )}

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {followUps.length === 0 ? (
                <p className="text-muted-foreground/50 text-[10px] py-4 text-center">Belum ada follow-up dijadwalkan.</p>
              ) : (
                followUps.map(fu => {
                  const isCompleting = completingFuId === fu.id;
                  return (
                    <div
                      key={fu.id}
                      className={cn(
                        "p-3 rounded-xl border border-border text-xs flex flex-col gap-2 transition-all",
                        fu.is_done ? "bg-slate-50/30 dark:bg-white/[0.01] opacity-75" : "bg-card shadow-xs"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground">
                              {fu.fu_type === 'whatsapp' ? '🟢 WhatsApp' : fu.fu_type === 'chat' ? '💬 Chat' : fu.fu_type === 'call' ? '📞 Telepon' : '🤝 Meeting'}
                            </span>
                            {fu.is_done && (
                              <span className="text-[9px] font-black uppercase text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                DONE
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Jadwal: {new Date(fu.scheduled_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            {fu.users?.name ? ` • PIC: ${fu.users.name.split(' ')[0]}` : ''}
                          </p>
                        </div>
                        {!fu.is_done && !isCompleting && (
                          <button
                            onClick={() => {
                              setCompletingFuId(fu.id)
                              setFuResultInput('')
                            }}
                            className="px-2 py-1 rounded-lg text-[9px] font-extrabold text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all cursor-pointer"
                          >
                            Tandai Selesai
                          </button>
                        )}
                      </div>

                      {fu.notes && (
                        <p className="text-[10px] text-muted-foreground bg-slate-50/50 dark:bg-white/[0.01] p-2 rounded-lg border border-border/40">
                          <strong>Notes:</strong> {fu.notes}
                        </p>
                      )}

                      {fu.is_done && fu.result && (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                          <strong>Hasil:</strong> {fu.result}
                        </p>
                      )}

                      {isCompleting && (
                        <div className="space-y-2 border-t border-border/50 pt-2">
                          <textarea
                            placeholder="Hasil follow-up..."
                            value={fuResultInput}
                            onChange={e => setFuResultInput(e.target.value)}
                            rows={1.5}
                            className="w-full px-2 py-1 text-xs text-foreground bg-background border border-border rounded-lg resize-none outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setCompletingFuId(null)}
                              className="px-2 py-1 rounded-lg text-[9px] text-muted-foreground hover:bg-slate-100 dark:hover:bg-white/5"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => handleCompleteFollowUp(fu.id, fu.fu_type)}
                              className="px-2 py-1 rounded-lg text-[9px] font-bold text-white bg-purple-500 hover:opacity-90"
                            >
                              Konfirmasi Selesai
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Activity Log */}
          <div className="glass-card rounded-2xl p-5 border border-border space-y-4">
            <h3 className="text-foreground font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} className="text-purple-650 dark:text-purple-400" />
              Linimasa Aktivitas
            </h3>

            <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border max-h-[60vh] overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <p className="text-muted-foreground/50 text-[10px] py-4">Belum ada log aktivitas.</p>
              ) : (
                activities.map(act => (
                  <div key={act.id} className="relative space-y-0.5">
                    {/* circle marker */}
                    <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-purple-500 border-2 border-slate-900" />
                    
                    <span className="text-[10px] text-muted-foreground/60 font-semibold uppercase">
                      {act.activity_type}
                    </span>
                    <p className="text-xs text-slate-750 dark:text-white/70">{act.description}</p>
                    <p className="text-[9px] text-muted-foreground/50">
                      {new Date(act.created_at).toLocaleString('id-ID')}
                      {act.users?.name ? ` oleh ${act.users.name}` : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* WhatsApp Modal */}
      <WhatsAppModal
        isOpen={isWaOpen}
        onClose={() => setIsWaOpen(false)}
        leadName={lead.full_name}
        leadPhone={lead.whatsapp_number}
        leadId={lead.id}
      />

      {/* Edit Profile Modal */}
      {isEditingCore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-foreground">Edit Data Utama Lead</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Source Campaign</label>
                <input
                  type="text"
                  value={editSource}
                  onChange={e => setEditSource(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Status Pipeline</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  {FUNNEL_STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">PIC CRO</label>
                <select
                  value={editPic}
                  onChange={e => setEditPic(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="">Belum di-assign</option>
                  {pics.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Lead Quality</label>
                <select
                  value={editLeadQuality}
                  onChange={e => setEditLeadQuality(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="">Belum dinilai</option>
                  {LEAD_QUALITY_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Lead Segment</label>
                <select
                  value={editLeadSegment}
                  onChange={e => setEditLeadSegment(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="">Pilih segment</option>
                  {LEAD_SEGMENT_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Entry Channel</label>
                <select
                  value={editEntryChannel}
                  onChange={e => setEditEntryChannel(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  {ENTRY_CHANNEL_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Next Action</label>
                <select
                  value={editNextAction}
                  onChange={e => setEditNextAction(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="">Pilih aksi berikutnya</option>
                  {NEXT_ACTION_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Next Follow-Up Date</label>
                <input
                  type="date"
                  value={editNextFollowUpDate}
                  onChange={e => setEditNextFollowUpDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl focus:ring-1 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>

            {LOST_STATUSES.includes(editStatus) && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Kategori Alasan Penolakan</label>
                <select
                  value={editLostReason}
                  onChange={e => setEditLostReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl cursor-pointer focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  <option value="">Pilih kategori alasan...</option>
                  {LOST_REASON_OPTIONS.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Reason ini masuk ke dashboard Reason Penolakan untuk evaluasi strategi.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Catatan Tambahan</label>
              <textarea
                placeholder="Catatan bebas..."
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl h-20 focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Funnel Notes</label>
              <textarea
                placeholder="Objection, arahan playbook, hasil handling, atau keputusan next step..."
                value={editFunnelNotes}
                onChange={e => setEditFunnelNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border outline-none rounded-xl h-20 focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            {coreError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-300">
                {coreError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
              <button
                onClick={() => {
                  setCoreError('')
                  setIsEditingCore(false)
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleSaveCore}
                className="px-4 py-2 text-xs font-bold rounded-xl text-white hover:glow-purple transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, hsl(250,84%,60%), hsl(280,60%,55%))' }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

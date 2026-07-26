'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Clock, Calendar,
  Edit, DollarSign, FileText,
  UserCheck, Trash2, ArrowRight,
} from 'lucide-react'
import { WhatsAppModal } from './WhatsAppModal'
import { WhatsAppButton } from './WhatsAppButton'
import { cn } from '@/lib/utils'
import { getFunnelStage, getStageBadgeClasses } from '@/lib/brand'
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

import type { LeadDetailProps, LeadInterventionWithUser, UserSummary, LeadWithUsers, FollowUpWithLead } from '@/types/crm'
import type { FuType, LeadRow, PaymentRow } from '@/lib/supabase/types'
import { isJsonRecord } from '@/types/crm'

export function LeadDetailClient({
  initialLead,
  initialPayments,
  initialPemetaan,
  initialExpertConsultations,
  initialActivities,
  initialFollowUps,
  initialInterventions,
  pics
}: LeadDetailProps) {
  const [lead, setLead] = useState<LeadWithUsers>(initialLead)
  const [payments, setPayments] = useState(initialPayments)
  const [pemetaan, setPemetaan] = useState(initialPemetaan[0] || null)
  const [expert, setExpert] = useState(initialExpertConsultations[0] || null)
  const [activities, setActivities] = useState(initialActivities)
  const [followUps, setFollowUps] = useState<FollowUpWithLead[]>(initialFollowUps || [])
  const [interventions, setInterventions] = useState<LeadInterventionWithUser[]>(initialInterventions || [])
  const [activeTab, setActiveTab] = useState<'payments' | 'pemetaan' | 'expert' | 'followups'>('payments')
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
  const [paymentMethod] = useState('Transfer')
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

  const userLabel = (user?: UserSummary | null, fallback?: string | null) => {
    if (user?.name) return user.name
    if (fallback) return fallback
    return '-'
  }

  const friendlyDuplicateError = (err?: unknown) => {
    const payload = isJsonRecord(err) ? err : null
    const duplicateLead = isJsonRecord(payload?.duplicate_lead) ? payload.duplicate_lead : null
    if (duplicateLead) {
      return `Nomor WhatsApp ini sudah terdaftar untuk ${duplicateLead.full_name} (${duplicateLead.source_campaign || 'tanpa campaign'}) dengan status ${duplicateLead.current_status || '-'}.`
    }

    const code = typeof payload?.code === 'string' ? payload.code : ''
    const message = typeof payload?.message === 'string' ? payload.message : ''
    const isDuplicate =
      code === '23505' ||
      message.includes('leads_whatsapp_normalized_unique') ||
      message.toLowerCase().includes('duplicate key')

    return isDuplicate
      ? 'Nomor WhatsApp ini sudah terdaftar. Cari nomor tersebut di menu Leads untuk membuka data existing.'
      : message || 'Terjadi kesalahan saat menyimpan data lead.'
  }

  const formatShortDate = (value?: string | null) => {
    if (!value) return '-'
    return new Date(value).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: '2-digit',
    })
  }

  const commercialLabel = (value?: string | null) => {
    if (value === 'Potential Paid') return 'Bisa Berbayar'
    if (value === 'Paid') return 'Berbayar'
    if (value === 'Free') return 'Gratis'
    return value || 'Gratis'
  }

  const latestIntervention = interventions[0] || null

  const buildRecommendedAction = (item?: LeadInterventionWithUser | null) => {
    if (!item) {
      return {
        title: 'Lead belum punya catatan chat',
        body: 'Kerjakan lead dari Hari Ini (Work Queue), lalu isi hasil chat agar masuk ke Report Harian dan Alasan Gagal.',
        nextAction: 'Tambah Catatan Chat',
        tone: 'amber',
      }
    }

    const objection = String(item.objection_category || '').toLowerCase()
    const solution = item.solution_given || 'Gunakan solusi/intervensi yang paling relevan.'
    const needsExpert = item.expert_needed || item.expert_type
    const potentialPaid = String(item.commercial_type || '').toLowerCase().includes('paid')

    if (needsExpert) {
      return {
        title: `Perlu dibantu ${item.expert_type || 'tim lain'}`,
        body: `Lead ini perlu dibantu. Pastikan kendalanya (${item.objection_category || '-'}) dan respon CRO (${solution}) sudah jelas sebelum diteruskan.`,
        nextAction: item.next_action || 'Jadwalkan Bantuan',
        tone: 'violet',
      }
    }

    if (potentialPaid) {
      return {
        title: 'Ada peluang layanan berbayar',
        body: `Validasi kebutuhan lead, jelaskan value layanan, lalu follow up dengan penawaran yang spesifik. Catatan peluang: ${item.service_opportunity || 'belum diisi'}.`,
        nextAction: item.next_action || 'Follow Up Penawaran',
        tone: 'blue',
      }
    }

    if (objection.includes('budget') || objection.includes('biaya') || objection.includes('uang')) {
      return {
        title: 'Kendala budget / biaya',
        body: 'Fokuskan follow-up pada value program, bukti hasil, risiko kalau menunda, dan opsi pembayaran/tahapan biaya bila memungkinkan.',
        nextAction: item.next_action || 'Follow Up Value',
        tone: 'emerald',
      }
    }

    if (objection.includes('waktu') || objection.includes('sibuk')) {
      return {
        title: 'Kendala waktu',
        body: 'Tawarkan slot follow-up yang spesifik dan ringkas. Gunakan pesan pendek yang langsung menjawab benefit utama untuk lead ini.',
        nextAction: item.next_action || 'Follow Up Jadwal',
        tone: 'orange',
      }
    }

    if (objection.includes('ragu') || objection.includes('trust') || objection.includes('percaya')) {
      return {
        title: 'Kendala ragu / belum percaya',
        body: 'Kirim social proof, alur program, testimoni, dan ajak konsultasi singkat agar keraguannya bisa dipetakan lebih jelas.',
        nextAction: item.next_action || 'Kirim Social Proof',
        tone: 'violet',
      }
    }

    return {
      title: item.objection_category ? `Kendala: ${item.objection_category}` : 'Catatan terakhir tersimpan',
      body: `Respon terakhir: ${solution}. Lanjutkan follow-up sesuai langkah berikutnya dan update hasil setelah ada respon.`,
      nextAction: item.next_action || 'Follow Up',
      tone: 'slate',
    }
  }

  const recommendedAction = buildRecommendedAction(latestIntervention)

  const recommendationText = [
    `Lead: ${lead.full_name}`,
    `Status: ${lead.current_status}`,
    latestIntervention ? `Kondisi: ${latestIntervention.lead_condition || '-'}` : 'Kondisi: belum ada catatan chat',
    latestIntervention ? `Kendala: ${latestIntervention.objection_category || '-'}` : 'Kendala: -',
    latestIntervention ? `Respon CRO: ${latestIntervention.solution_given || '-'}` : 'Respon CRO: -',
    `Rekomendasi: ${recommendedAction.body}`,
    `Langkah berikutnya: ${recommendedAction.nextAction}`,
    latestIntervention?.next_follow_up_date ? `FU berikutnya: ${formatShortDate(latestIntervention.next_follow_up_date)}` : null,
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
      setInterventionMessage({ text: 'Kondisi lead, kendala, dan respon CRO wajib diisi.', type: 'error' })
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
      setInterventionMessage({ text: 'Gagal menyimpan catatan chat: ' + error.message, type: 'error' })
      return
    }

    if (data?.[0]) {
      setInterventions(prev => [data[0], ...prev])
      setInterventionMessage({ text: 'Catatan chat berhasil disimpan.', type: 'success' })
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
      setLead((prev: LeadRow) => ({ ...prev, ...leadUpdates }))

      await logActivity(
        'Intervention Logged',
        `${interventionForm.lead_condition} | Kendala: ${interventionForm.objection_category} | Respon CRO: ${interventionForm.solution_given}`,
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
      ...funnelPayload,
      updated_at: updatedAt
    }
    setLead(updatedLead)
    setEditPhone(cleanPhone)
    setIsEditingCore(false)
    await logActivity('Lead Updated', 'Data lead diperbarui manual', (await supabase.auth.getUser()).data.user?.id || null)
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

  const handleDeletePayment = async (payment: PaymentRow) => {
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

  const stage = getFunnelStage(lead.current_status)
  const pendingFollowUps = followUps.filter((f) => !f.is_done)

  return (
    <div className="w-full p-4 sm:p-6 space-y-4 animate-fade-in">
      {/* 1. Identitas */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-secondary text-primary border border-border flex items-center justify-center font-display text-lg font-semibold flex-shrink-0">
              {lead.full_name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground truncate">
                {lead.full_name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {lead.whatsapp_number}
                {lead.email ? ` · ${lead.email}` : ''}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Campaign: {lead.source_campaign || '—'} · PIC:{' '}
                {pics.find((p) => p.id === lead.assigned_cro_id)?.name || 'Belum di-assign'}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Last update:{' '}
                <span className="font-semibold text-foreground">
                  {lead.updated_by_user?.name || pics.find((p) => p.id === lead.updated_by)?.name || '—'}
                </span>
                {' · '}
                {lead.updated_at
                  ? new Date(lead.updated_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '-'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={cn('text-[10px] px-2 py-0.5 rounded-md', getStageBadgeClasses(lead.current_status))}>
                  {stage ? `Tahap ${stage.id} · ${stage.labelId}` : 'Tahap —'}
                </span>
                <span className="text-[10px] text-muted-foreground">{lead.current_status}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <div className="w-full sm:w-44">
              <WhatsAppButton
                leadName={lead.full_name}
                leadPhone={lead.whatsapp_number}
                leadId={lead.id}
                picName={pics.find((p) => p.id === lead.assigned_cro_id)?.name}
              />
            </div>
            <Link
              href={`/work-queue?lead=${lead.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-accent text-accent-foreground hover:opacity-90"
            >
              <ArrowRight size={14} />
              Kerjakan di Hari Ini
            </Link>
            <button
              type="button"
              onClick={() => setIsEditingCore(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-border bg-secondary text-foreground hover:bg-secondary/80"
            >
              <Edit size={14} />
              Edit data
            </button>
          </div>
        </div>
      </section>

      {/* 2. Tahap & Next */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Tahap & langkah berikutnya</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ringkas posisi lead. Catatan kerja harian dari menu Hari Ini / Work Queue.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <InfoCard label="Tahap" value={stage ? `${stage.id}. ${stage.labelId}` : '—'} hint={stage?.meaningId} />
          <InfoCard label="Status detail" value={lead.current_status} />
          <InfoCard label="Next action" value={lead.next_action || recommendedAction.nextAction || '—'} />
          <InfoCard
            label="Follow-up berikutnya"
            value={lead.next_follow_up_date ? formatShortDate(lead.next_follow_up_date) : '—'}
          />
        </div>
        <div className="mt-4 rounded-xl border border-border bg-secondary/50 px-4 py-3">
          <p className="text-[11px] font-semibold text-accent">{recommendedAction.title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{recommendedAction.body}</p>
          {latestIntervention && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Chat terakhir: {latestIntervention.objection_category || '—'} → {latestIntervention.solution_given || '—'}
            </p>
          )}
        </div>
      </section>

      {/* 3. Modul: Pembayaran / Pemetaan / Expert / Follow-up */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Pembayaran & proses</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Modul sekunder — buka sesuai kebutuhan tahap lead.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            { id: 'payments' as const, label: 'Pembayaran', icon: DollarSign },
            { id: 'pemetaan' as const, label: 'Pemetaan', icon: FileText },
            { id: 'expert' as const, label: 'Expert', icon: UserCheck },
            { id: 'followups' as const, label: 'Follow-Up', icon: Calendar },
          ]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors',
                activeTab === tab.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-secondary/40 text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.id === 'followups' && pendingFollowUps.length > 0 ? ` (${pendingFollowUps.length})` : ''}
              {tab.id === 'payments' && payments.length > 0 ? ` (${payments.length})` : ''}
            </button>
          ))}
        </div>

        {activeTab === 'payments' && (
          <div className="space-y-4">
            {paymentMessage.text && (
              <div className={cn(
                'p-3 rounded-xl text-xs font-semibold border',
                paymentMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300'
                  : 'bg-destructive/5 border-destructive/20 text-destructive'
              )}>
                {paymentMessage.text}
              </div>
            )}
            <div className="space-y-2">
              {payments.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Belum ada pembayaran.</p>
              ) : (
                payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3">
                    <div>
                      <p className="text-xs font-semibold text-foreground uppercase">{p.payment_type}</p>
                      <p className="text-[10px] text-muted-foreground">{p.payment_date} · {p.payment_method}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">Rp {Number(p.amount).toLocaleString('id-ID')}</p>
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(p)}
                        disabled={deletingPaymentId === p.id}
                        className="p-2 rounded-lg border border-destructive/15 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
              <p className="text-xs font-semibold text-foreground">Catat pembayaran</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={paymentType} onChange={(e) => setPaymentType(e.target.value)} className="detail-input">
                  <option value="pemetaan">Pemetaan / Roadmap</option>
                  <option value="seat_lock">Seat Lock</option>
                </select>
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} className="detail-input" />
              </div>
              <input
                type="text"
                placeholder="Catatan transfer..."
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="detail-input"
              />
              <button type="button" onClick={handleAddPayment} className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground">
                Simpan & verifikasi
              </button>
            </div>
          </div>
        )}

        {activeTab === 'pemetaan' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Status form</span>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="detail-input">
                  <option value="not_sent">Belum dikirim</option>
                  <option value="sent">Sudah dikirim</option>
                  <option value="submitted">Sudah diisi</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Jadwal</span>
                <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="detail-input" />
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-[11px] font-semibold text-muted-foreground">Status hasil</span>
                <select value={resultStatus} onChange={(e) => setResultStatus(e.target.value)} className="detail-input">
                  <option value="not_ready">Belum siap</option>
                  <option value="waiting">Menunggu hasil</option>
                  <option value="ready">Hasil siap</option>
                </select>
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-[11px] font-semibold text-muted-foreground">Catatan hasil</span>
                <textarea value={resultNotes} onChange={(e) => setResultNotes(e.target.value)} className="detail-input min-h-[80px]" />
              </label>
            </div>
            <button type="button" onClick={handleSavePemetaan} className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground">
              Simpan pemetaan
            </button>
          </div>
        )}

        {activeTab === 'expert' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Nama expert</span>
                <input value={expertName} onChange={(e) => setExpertName(e.target.value)} className="detail-input" />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Jadwal</span>
                <input type="datetime-local" value={expertScheduled} onChange={(e) => setExpertScheduled(e.target.value)} className="detail-input" />
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-[11px] font-semibold text-muted-foreground">Hasil konsultasi</span>
                <input value={consultResult} onChange={(e) => setConsultResult(e.target.value)} className="detail-input" />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Rekomendasi</span>
                <input value={consultRecommend} onChange={(e) => setConsultRecommend(e.target.value)} className="detail-input" />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Next step</span>
                <input value={consultNext} onChange={(e) => setConsultNext(e.target.value)} className="detail-input" />
              </label>
            </div>
            <button type="button" onClick={handleSaveExpert} className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground">
              Simpan expert
            </button>
          </div>
        )}

        {activeTab === 'followups' && (
          <div className="space-y-4">
            {fuMessage.text && (
              <div className={cn(
                'p-3 rounded-xl text-xs font-semibold border',
                fuMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300'
                  : 'bg-destructive/5 border-destructive/20 text-destructive'
              )}>
                {fuMessage.text}
              </div>
            )}
            <div className="space-y-2">
              {followUps.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Belum ada jadwal follow-up.</p>
              ) : (
                followUps.map((fu) => (
                  <div key={fu.id} className="rounded-xl border border-border px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {formatShortDate(fu.scheduled_date)} · {fu.fu_type}
                          {fu.is_done ? ' · selesai' : ''}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{fu.notes || 'Tanpa catatan'}</p>
                      </div>
                      {!fu.is_done && (
                        <button
                          type="button"
                          onClick={() => setCompletingFuId(completingFuId === fu.id ? null : fu.id)}
                          className="text-[10px] font-semibold text-accent"
                        >
                          Selesai
                        </button>
                      )}
                    </div>
                    {completingFuId === fu.id && (
                      <div className="mt-2 flex gap-2">
                        <input
                          value={fuResultInput}
                          onChange={(e) => setFuResultInput(e.target.value)}
                          placeholder="Hasil follow-up..."
                          className="detail-input"
                        />
                        <button
                          type="button"
                          onClick={() => handleCompleteFollowUp(fu.id, fu.fu_type)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground"
                        >
                          Simpan
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            {showAddFu ? (
              <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="date" value={newFuDate} onChange={(e) => setNewFuDate(e.target.value)} className="detail-input" />
                  <select value={newFuType} onChange={(e) => setNewFuType(e.target.value as typeof newFuType)} className="detail-input">
                    <option value="whatsapp">WhatsApp</option>
                    <option value="chat">Chat</option>
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </div>
                <input value={newFuNotes} onChange={(e) => setNewFuNotes(e.target.value)} placeholder="Catatan..." className="detail-input" />
                <div className="flex gap-2">
                  <button type="button" onClick={handleAddFollowUp} className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground">
                    Simpan jadwal
                  </button>
                  <button type="button" onClick={() => setShowAddFu(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground">
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddFu(true)}
                className="text-xs font-semibold text-accent"
              >
                + Jadwalkan follow-up
              </button>
            )}
          </div>
        )}
      </section>

      {/* 4. Timeline */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={15} className="text-accent" />
          <h2 className="text-sm font-semibold text-foreground">Riwayat kontak & aktivitas CRO</h2>
        </div>
        {activities.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Belum ada aktivitas.</p>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {activities.slice(0, 40).map((act) => (
              <li key={act.id} className="rounded-xl border border-border px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold text-foreground">{act.activity_type}</p>
                  <p className="text-[10px] text-muted-foreground flex-shrink-0">
                    {new Date(act.created_at).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{act.description}</p>
                <p className="text-[10px] text-muted-foreground/80 mt-1">
                  oleh{' '}
                  <span className="font-semibold text-foreground/80">
                    {act.users?.name || pics.find((p) => p.id === act.created_by)?.name || 'Sistem'}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <WhatsAppModal
        isOpen={isWaOpen}
        onClose={() => setIsWaOpen(false)}
        leadName={lead.full_name}
        leadPhone={lead.whatsapp_number}
        leadId={lead.id}
      />

      {isEditingCore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-display text-lg font-semibold text-foreground">Edit data lead</h3>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Nama</span>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className="detail-input" />
              </label>
              <label className="block space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-semibold text-muted-foreground">WhatsApp</span>
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="detail-input" />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Email</span>
                <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="detail-input" />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Campaign</span>
                <input value={editSource} onChange={(e) => setEditSource(e.target.value)} className="detail-input" />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Status</span>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="detail-input">
                  {FUNNEL_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">PIC</span>
                <select value={editPic} onChange={(e) => setEditPic(e.target.value)} className="detail-input">
                  <option value="">Belum di-assign</option>
                  {pics.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Next action</span>
                <select value={editNextAction} onChange={(e) => setEditNextAction(e.target.value)} className="detail-input">
                  <option value="">Pilih...</option>
                  {NEXT_ACTION_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground">Next FU</span>
                <input type="date" value={editNextFollowUpDate} onChange={(e) => setEditNextFollowUpDate(e.target.value)} className="detail-input" />
              </label>
            </div>

            <details className="rounded-xl border border-border px-3 py-2">
              <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">Field lanjutan</summary>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <select value={editLeadQuality} onChange={(e) => setEditLeadQuality(e.target.value)} className="detail-input">
                  <option value="">Quality</option>
                  {LEAD_QUALITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select value={editLeadSegment} onChange={(e) => setEditLeadSegment(e.target.value)} className="detail-input">
                  <option value="">Segment</option>
                  {LEAD_SEGMENT_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <select value={editEntryChannel} onChange={(e) => setEditEntryChannel(e.target.value)} className="detail-input">
                  {ENTRY_CHANNEL_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <textarea
                value={editFunnelNotes}
                onChange={(e) => setEditFunnelNotes(e.target.value)}
                placeholder="Funnel notes..."
                className="detail-input mt-3 min-h-[72px]"
              />
            </details>

            {LOST_STATUSES.includes(editStatus) && (
              <select value={editLostReason} onChange={(e) => setEditLostReason(e.target.value)} className="detail-input">
                <option value="">Alasan lost...</option>
                {LOST_REASON_OPTIONS.map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            )}

            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Catatan..."
              className="detail-input min-h-[72px]"
            />

            {coreError && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive">
                {coreError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => {
                  setCoreError('')
                  setIsEditingCore(false)
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveCore}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-accent text-accent-foreground"
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

function InfoCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-1 truncate">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{hint}</p>}
    </div>
  )
}

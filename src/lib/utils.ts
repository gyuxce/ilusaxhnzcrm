import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { LeadSource, LeadStage, FuType, MessageStatus } from '@/lib/supabase/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateWALink(phone: string, message?: string): string {
  const cleanPhone = phone.replace(/\D/g, '')
  const normalizedPhone = cleanPhone.startsWith('0')
    ? '62' + cleanPhone.slice(1)
    : cleanPhone
  const encodedMessage = message ? encodeURIComponent(message) : ''
  return `https://wa.me/${normalizedPhone}${encodedMessage ? '?text=' + encodedMessage : ''}`
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.startsWith('62')) return '+' + clean
  if (clean.startsWith('0')) return '+62' + clean.slice(1)
  return '+62' + clean
}

export const STAGE_LABELS: Record<LeadStage, string> = {
  new: 'Baru',
  probing: 'Probing',
  hot: 'Hot Lead',
  potential: 'Potensial',
  converted: 'Konversi',
  rejected: 'Reject',
}

export const STAGE_COLORS: Record<LeadStage, string> = {
  new: 'bg-slate-500',
  probing: 'bg-blue-500',
  hot: 'bg-orange-500',
  potential: 'bg-yellow-500',
  converted: 'bg-green-500',
  rejected: 'bg-red-500',
}

export const SOURCE_LABELS: Record<LeadSource, string> = {
  ig: 'Instagram',
  fb: 'Facebook',
  linkedin: 'LinkedIn',
  webinar: 'Webinar',
  manual: 'Manual',
  referral: 'Referral',
  other: 'Lainnya',
}

export const SOURCE_ICONS: Record<LeadSource, string> = {
  ig: '📸',
  fb: '📘',
  linkedin: '💼',
  webinar: '🎓',
  manual: '✍️',
  referral: '🤝',
  other: '📌',
}

export const SOURCE_COLORS: Record<LeadSource, string> = {
  ig: 'text-pink-400',
  fb: 'text-blue-400',
  linkedin: 'text-sky-400',
  webinar: 'text-purple-400',
  manual: 'text-gray-400',
  referral: 'text-emerald-400',
  other: 'text-slate-400',
}

export const FU_LABELS: Record<FuType, string> = {
  chat: '💬 Chat',
  call: '📞 Telepon',
  whatsapp: '🟢 WhatsApp',
  meeting: '🤝 Meeting',
}

export const MSG_STATUS_LABELS: Record<MessageStatus, string> = {
  connected: 'Terhubung',
  not_connected: 'Tidak Terhubung',
  no_response: 'Tidak Respon',
  restricted: 'Dibatasi',
  pending: 'Menunggu',
}

export const MSG_STATUS_COLORS: Record<MessageStatus, string> = {
  connected: 'text-green-400',
  not_connected: 'text-red-400',
  no_response: 'text-yellow-400',
  restricted: 'text-orange-400',
  pending: 'text-slate-400',
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Returns YYYY-MM-DD in Asia/Jakarta (WIB) timezone. */
export function getTodayInWIB(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
}

export function formatRelativeDate(date: string | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Hari ini'
  if (diffDays === 1) return 'Kemarin'
  if (diffDays < 7) return `${diffDays} hari lalu`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} minggu lalu`
  return formatDate(date)
}

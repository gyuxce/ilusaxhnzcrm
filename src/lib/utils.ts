import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

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

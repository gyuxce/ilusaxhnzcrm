import { z } from 'zod'
import { LOST_STATUSES } from '@/lib/lost-reasons'

// Helper untuk normalisasi nomor WhatsApp Indonesia (62xxx / 08xxx)
export function normalizeWhatsApp(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1)
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned
  }
  return cleaned
}

// Zod Schema untuk Form Tambah / Edit Lead
export const leadSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
  whatsapp_number: z
    .string()
    .min(8, 'Nomor WhatsApp minimal 8 digit')
    .refine(val => /^(\+?62|08|8)\d{7,13}$/.test(val.replace(/\s+/g, '')), {
      message: 'Format nomor WhatsApp tidak valid (contoh: 08123456789 atau 628123456789)',
    }),
  email: z
    .string()
    .email('Format email tidak valid')
    .or(z.literal(''))
    .optional(),
  source_campaign: z
    .string()
    .min(1, 'Source campaign wajib diisi')
    .max(120, 'Source campaign maksimal 120 karakter'),
  lead_type: z.enum(['inbound', 'outbound']),
  current_status: z.string().min(1, 'Status pipeline wajib dipilih'),
  assigned_cro_id: z.string().optional(),
  notes: z.string().optional(),
  lead_entry_date: z.string().min(1, 'Tanggal masuk wajib diisi'),
  lost_reason: z.string().optional(),
  lead_quality: z.string().optional(),
  lead_segment: z.string().optional(),
  entry_channel: z.string().optional(),
  next_action: z.string().optional(),
  next_follow_up_date: z.string().optional(),
  funnel_notes: z.string().optional(),
}).refine(data => {
  // Jika statusnya Not Interested / Not Eligible, lost_reason wajib diisi
  if (LOST_STATUSES.includes(data.current_status)) {
    return Boolean(data.lost_reason && data.lost_reason.trim().length > 0)
  }
  return true;
}, {
  message: 'Alasan gagal (lost reason) wajib diisi untuk status Not Interested / Not Eligible',
  path: ['lost_reason'],
})

export type LeadFormValues = z.infer<typeof leadSchema>

// Zod Schema untuk Work Queue Chat Handling
export const workQueueFormSchema = z.object({
  lead_condition: z.string().min(1, 'Kondisi lead wajib dipilih'),
  objection_category: z.string().optional(),
  solution_given: z.string().optional(),
  notes: z.string().optional(),
  next_action: z.string().min(1, 'Langkah berikutnya wajib dipilih'),
  next_follow_up_date: z.string().optional(),
  expert_needed: z.boolean().default(false),
  expert_type: z.string().optional(),
  commercial_type: z.enum(['Free', 'Potential Paid', 'Paid']).default('Free'),
  service_opportunity: z.string().optional(),
  result: z.string().optional(),
})

export type WorkQueueFormValues = z.infer<typeof workQueueFormSchema>

import type { DanacitaFlow, DanacitaLabel, DanacitaStatus } from '@/lib/supabase/types'

export const DANACITA_LABEL_OPTIONS: { value: DanacitaLabel; label: string }[] = [
  { value: 'pendidikan', label: 'Dana Pendidikan' },
  { value: 'keberangkatan', label: 'Dana Keberangkatan' },
  { value: 'pendidikan_keberangkatan', label: 'Dana Pendidikan + Keberangkatan' },
]

export const DANACITA_STATUS_OPTIONS: { value: DanacitaStatus; label: string; needsReason: boolean }[] = [
  { value: 'sedang_ditinjau', label: 'Sedang ditinjau', needsReason: false },
  { value: 'tidak_eligible', label: 'Tidak eligible', needsReason: true },
  { value: 'berhasil', label: 'Berhasil mendapatkan pendanaan', needsReason: false },
  { value: 'lainnya', label: 'Lainnya', needsReason: true },
]

export const DANACITA_FLOW_LABEL: Record<DanacitaFlow, string> = {
  hot: 'Hot (arahan CRO)',
  cold: 'Cold (pengajuan mandiri)',
}

export function danacitaLabelText(label: DanacitaLabel): string {
  return DANACITA_LABEL_OPTIONS.find((o) => o.value === label)?.label ?? label
}

export function danacitaStatusText(status: DanacitaStatus): string {
  return DANACITA_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

export function danacitaStatusNeedsReason(status: DanacitaStatus): boolean {
  return DANACITA_STATUS_OPTIONS.find((o) => o.value === status)?.needsReason ?? false
}

export const DANACITA_STATUS_COLOR: Record<DanacitaStatus, { color: string; soft: string }> = {
  sedang_ditinjau: { color: '#f59e0b', soft: 'rgba(245,158,11,0.12)' },
  tidak_eligible: { color: '#ef4444', soft: 'rgba(239,68,68,0.12)' },
  berhasil: { color: '#22c55e', soft: 'rgba(34,197,94,0.12)' },
  lainnya: { color: '#64748b', soft: 'rgba(100,116,139,0.12)' },
}

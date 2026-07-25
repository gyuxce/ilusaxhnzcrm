/**
 * PRD V3 — 3-stage lead flow vocabulary.
 *
 * Stage 1 (Leads → Kerjakan): set Current Status + Hasil Follow-up.
 * Stage 2 (menunggu arah lanjut): update Status Current Staging + nominal pemetaan.
 * Stage 3 (Kanban pipeline): Pemetaan → Expert → Seat Lock → Closing.
 *
 * Additive on top of the legacy 6-stage funnel — old statuses still render;
 * these constants drive the new PRD menus and flows.
 */

/** A.1 — Current Status pilihan saat upload / Stage 1. */
export const STAGE1_CURRENT_STATUS_OPTIONS = [
  'New Lead',
  'Bridging',
  'Pitching',
] as const

/** A.2 — Hasil Follow-up, aktif kalau Current Status = Pitching. */
export const STAGE1_HASIL_FOLLOWUP_OPTIONS = [
  'Interested to Pemetaan',
  'Interested to Interview',
  'Interested in Webinar',
  'In-doubt',
  'No Response',
  'Not Interested',
  'Not Eligible',
] as const

/** Hasil follow-up yang memunculkan Aksi CRO. */
export const STAGE1_AKSI_TRIGGER = ['In-doubt', 'No Response', 'Not Interested'] as const

/** A.2 — Aksi CRO. */
export const STAGE1_AKSI_CRO_OPTIONS = [
  'Memberikan edukasi value program',
  'Memberikan legalitas / testimoni',
  'Memberikan offer cicilan / metode bayar',
  'Menawarkan sesi konsultasi via Telfon',
] as const

/** A.2 — Alasan Penolakan, aktif kalau hasil follow-up = Not Interested. */
export const STAGE1_ALASAN_PENOLAKAN_OPTIONS = [
  'Trust / Legalitas',
  'Kendala Biaya',
  'Masalah Timing – hanya ingin tahu',
  'Dokumen / Administrasi',
  'Lokasi LPK Jauh',
  'Banding Kompetitor',
  'No Response',
] as const

/** B.1 — Status Current Staging yang masuk menu Stage 2 (bukan exit). */
export const STAGE2_ENTRY_STATUSES = [
  'Interested to Pemetaan',
  'Interested to Interview',
  'Interested in Webinar',
  'In-doubt',
  'No Response',
] as const

/**
 * Statuses that keep a lead visible in the Stage 2 list.
 * Entry statuses (interested) + "Menunggu arahan selanjutnya" (holding —
 * belum concrete ke Stage 3). "Lainnya" tidak mengubah status, jadi tetap
 * pakai status interested-nya.
 */
export const STAGE2_VISIBLE_STATUSES = [
  ...STAGE2_ENTRY_STATUSES,
  'Menunggu arahan selanjutnya',
] as const

/** B.2 — Update Status Current Staging di Kerjakan Stage 2. */
export const STAGE2_UPDATE_STATUS_OPTIONS = [
  'Menunggu jadwal pemetaan',
  'Menunggu hasil pemetaan',
  'Menunggu jadwal expert consultation',
  'Menunggu pembayaran seat-lock',
  'Menunggu arahan selanjutnya',
  'Lainnya (tulis di note)',
] as const

/** C.2 — Status Stage 3 (Detail Stage 3). */
export const STAGE3_STATUS_OPTIONS = [
  'Menunggu jadwal pemetaan',
  'Menunggu hasil pemetaan',
  'Menunggu jadwal expert consultation',
  'Menunggu pembayaran seat-lock',
  'Jalur Akselerasi',
  'Closing Seat Lock',
  'Cold Leads',
  'Failed',
] as const

/** C.2 — Alasan Failed. */
export const STAGE3_FAILED_REASON_OPTIONS = [
  'Trust / Legalitas',
  'Kendala Biaya',
  'Masalah Timing – hanya ingin tahu',
  'Dokumen / Administrasi',
  'Lokasi LPK Jauh',
  'Banding Kompetitor',
] as const

/** Exit lanes (bukan tahap pipeline utama). */
export const STAGE3_EXIT_STATUSES = ['Cold Leads', 'Failed'] as const

/** Status yang dianggap sudah closing berhasil. */
export const STAGE3_WON_STATUSES = ['Closing Seat Lock'] as const

/** C.1 — Kolom Kanban Stage 3. */
export const STAGE3_BOARD_COLUMNS = [
  {
    key: 'pemetaan',
    label: 'Pemetaan',
    color: '#8b5cf6',
    soft: 'rgba(139,92,246,0.10)',
    statuses: ['Menunggu jadwal pemetaan', 'Menunggu hasil pemetaan'] as string[],
  },
  {
    key: 'expert',
    label: 'Expert',
    color: '#10b981',
    soft: 'rgba(16,185,129,0.10)',
    statuses: ['Menunggu jadwal expert consultation'] as string[],
  },
  {
    key: 'seatlock',
    label: 'Menunggu pembayaran seat-lock',
    color: '#f59e0b',
    soft: 'rgba(245,158,11,0.10)',
    statuses: ['Menunggu pembayaran seat-lock', 'Jalur Akselerasi'] as string[],
  },
  {
    key: 'closing',
    label: 'Closing Seat Lock',
    color: '#22c55e',
    soft: 'rgba(34,197,94,0.10)',
    statuses: ['Closing Seat Lock'] as string[],
  },
  {
    key: 'exit',
    label: 'Keluar · Cold / Failed',
    color: '#9a3412',
    soft: 'rgba(154,52,18,0.10)',
    statuses: ['Cold Leads', 'Failed'] as string[],
  },
] as const

export type Stage3ColumnKey = (typeof STAGE3_BOARD_COLUMNS)[number]['key']

const STAGE3_STATUS_TO_COLUMN = new Map<string, Stage3ColumnKey>(
  STAGE3_BOARD_COLUMNS.flatMap((col) => col.statuses.map((s) => [s, col.key]))
)

/** Map a PRD Stage 3 status to its kanban column key. */
export function getStage3Column(status: string): Stage3ColumnKey | null {
  return STAGE3_STATUS_TO_COLUMN.get(status) ?? null
}

/** Default status when a card is dropped onto a column. */
export function resolveStage3DropStatus(
  currentStatus: string,
  columnKey: string
): string | null {
  const col = STAGE3_BOARD_COLUMNS.find((c) => c.key === columnKey)
  if (!col) return null
  if (col.statuses.includes(currentStatus)) return currentStatus
  return col.statuses[0] ?? null
}

/** Badge classes for a PRD stage 3 status. */
export function getStage3BadgeClasses(status: string): string {
  const key = getStage3Column(status)
  const col = STAGE3_BOARD_COLUMNS.find((c) => c.key === key)
  if (!col) return 'bg-muted text-muted-foreground border border-border'
  return 'border border-transparent text-foreground'
}

/** Apakah status termasuk exit Stage 3 (Cold/Failed). */
export function isStage3ExitStatus(status: string): boolean {
  return (STAGE3_EXIT_STATUSES as readonly string[]).includes(status)
}

/** Apakah status termasuk won Stage 3. */
export function isStage3WonStatus(status: string): boolean {
  return (STAGE3_WON_STATUSES as readonly string[]).includes(status)
}

/** Apakah status masuk menu Stage 2 (entry). */
export function isStage2EntryStatus(status: string): boolean {
  return (STAGE2_ENTRY_STATUSES as readonly string[]).includes(status)
}

/** Gabungan semua status PRD (untuk validasi / filter). */
export const ALL_PRD_STATUSES = [
  ...STAGE1_CURRENT_STATUS_OPTIONS,
  ...STAGE1_HASIL_FOLLOWUP_OPTIONS,
  ...STAGE2_UPDATE_STATUS_OPTIONS,
  ...STAGE3_STATUS_OPTIONS,
] as const

/**
 * Harunokaze CRO — product vocabulary & stage map (Sprint A–D).
 *
 * `current_status` remains the DB source of truth.
 * Stage 1–6 is a stable UI/reporting mapping — no destructive migrations.
 */

import { STAGE3_EXIT_STATUSES } from './prd-stages'

export const PRODUCT = {
  name: 'CRM Harunokaze',
  shortName: 'Harunokaze',
  partnership: 'HNZ × Wiwitan',
  taglineId: 'Sistem kerja CRO — jelas, tenang, siap dipakai tim',
  taglineEn: 'CRO workspace — clear, calm, built for the team',
} as const

export type UserRole = 'admin' | 'owner' | 'cro'

/**
 * Simplified funnel stages (1–6).
 * Sub-steps stay as `current_status` strings.
 */
export const FUNNEL_STAGES = [
  {
    id: 1 as const,
    key: 'baru',
    labelId: 'Baru',
    labelEn: 'New',
    meaningId: 'Lead masuk, belum atau baru dihubungi',
    color: 'var(--stage-1)',
    soft: 'var(--stage-1-soft)',
    defaultStatus: 'Input Manual',
    statuses: ['Input Manual', 'New Lead', 'Contacted'],
  },
  {
    id: 2 as const,
    key: 'diskusi',
    labelId: 'Diskusi',
    labelEn: 'Discussion',
    meaningId: 'Sedang edukasi / pitching',
    color: 'var(--stage-2)',
    soft: 'var(--stage-2-soft)',
    defaultStatus: 'Pitching',
    statuses: [
      'Pitching',
      'Bridging',
      'Interested',
      // PRD V3 (prd-stages.ts) — hasil follow-up & staging Stage 2:
      'Interested to Pemetaan',
      'Interested to Interview',
      'Interested in Webinar',
      'In-doubt',
      'No Response',
      'Menunggu arahan selanjutnya',
    ],
  },
  {
    id: 3 as const,
    key: 'pemetaan',
    labelId: 'Pemetaan',
    labelEn: 'Mapping',
    meaningId: 'Assessment / pemetaan berjalan',
    color: 'var(--stage-3)',
    soft: 'var(--stage-3-soft)',
    defaultStatus: 'Pemetaan Scheduled',
    statuses: [
      'Pemetaan Scheduled',
      'Pemetaan Done',
      'Waiting Result',
      'Result Ready',
      'Sent Result Pemetaan',
      'Placement Test Scheduled',
      'Placement Test Done',
      // PRD V3 (prd-stages.ts) — Stage 3 board, kolom pemetaan:
      'Menunggu jadwal pemetaan',
      'Menunggu hasil pemetaan',
    ],
  },
  {
    id: 4 as const,
    key: 'expert',
    labelId: 'Expert',
    labelEn: 'Expert',
    meaningId: 'Butuh bantuan expert',
    color: 'var(--stage-4)',
    soft: 'var(--stage-4-soft)',
    defaultStatus: 'Expert Consultation Scheduled',
    statuses: [
      'Expert Consultation Scheduled',
      'Expert Consultation Done',
      // PRD V3 (prd-stages.ts) — Stage 3 board, kolom expert:
      'Menunggu jadwal expert consultation',
    ],
  },
  {
    id: 5 as const,
    key: 'closing',
    labelId: 'Closing',
    labelEn: 'Closing',
    meaningId: 'Offer seat lock / follow-up closing',
    color: 'var(--stage-5)',
    soft: 'var(--stage-5-soft)',
    defaultStatus: 'Seat Lock Offered',
    statuses: [
      'Seat Lock Offered',
      'Belum Berhasil Closing',
      // PRD V3 (prd-stages.ts) — Stage 3 board, menunggu seat-lock / jalur cepat:
      'Menunggu pembayaran seat-lock',
      'Jalur Akselerasi',
    ],
  },
  {
    id: 6 as const,
    key: 'closing_berhasil',
    labelId: 'Closing berhasil',
    labelEn: 'Closing succeeded',
    meaningId: 'Sudah bayar seat lock / mulai onboarding',
    color: 'var(--stage-6)',
    soft: 'var(--stage-6-soft)',
    defaultStatus: 'Seat Lock Paid',
    /** Stage 6 = win only. "Tidak lanjut" is an exit, not tahap 6. */
    statuses: [
      'Seat Lock Paid',
      'Onboarding',
      'Class Started',
      // PRD V3 (prd-stages.ts) — Stage 3 board, kolom closing:
      'Closing Seat Lock',
    ],
  },
] as const

export type FunnelStageId = (typeof FUNNEL_STAGES)[number]['id']

/** Terminal win outcomes (= tahap 6). */
export const WON_STATUSES = ['Seat Lock Paid', 'Onboarding', 'Class Started', 'Closing Seat Lock'] as const

/**
 * Exit outcomes — bukan tahap bernomor; lead berhenti di tengah jalan.
 * Union Stage 1 exit ('Not Interested'/'Not Eligible') + Stage 3 exit PRD V3
 * (STAGE3_EXIT_STATUSES) — satu sumber, tidak diketik ulang di dua tempat.
 */
export const LOST_OUTCOME_STATUSES = ['Not Interested', 'Not Eligible', ...STAGE3_EXIT_STATUSES] as const

/**
 * Simple funnel story for team & clients (keep language plain).
 */
export const SIMPLE_FUNNEL_FLOW = {
  titleId: 'Alur lead (sederhana)',
  titleEn: 'Lead flow (simple)',
  stepsId: [
    '1 · Baru — lead baru masuk',
    '2 · Diskusi — lagi ngobrol / pitching',
    '3 · Pemetaan — assessment / pemetaan',
    '4 · Expert — butuh bantuan expert',
    '5 · Closing — lagi ditawar seat lock',
    '6 · Closing berhasil — sudah bayar / onboarding',
  ],
  stepsEn: [
    '1 · New — lead just entered',
    '2 · Discussion — talking / pitching',
    '3 · Mapping — assessment in progress',
    '4 · Expert — needs expert help',
    '5 · Closing — seat lock offered',
    '6 · Closing succeeded — paid / onboarding',
  ],
  exitId:
    'Keluar · Tidak lanjut — lead berhenti (bukan tahap 6). Bisa terjadi dari tahap mana pun.',
  exitEn:
    'Exit · Not continuing — lead stopped (not stage 6). Can happen from any stage.',
  croId:
    'Kerjaan CRO: pilih lead → WhatsApp → isi langkah chat 1–5 → Simpan. Pipeline hanya untuk pantau posisi.',
  croEn:
    'CRO desk: pick lead → WhatsApp → fill chat steps 1–5 → Save. Pipeline is for monitoring only.',
} as const

/** Board-only column key per tahap — beda dari FUNNEL_STAGES.key (istilah UI kanban). */
const PIPELINE_KEY_BY_STAGE_ID = {
  1: 'baru',
  2: 'diskusi',
  3: 'pemetaan',
  4: 'expert',
  5: 'closing',
  6: 'menang',
} as const

/**
 * Pipeline board columns — tahap 1–6 (statuses diturunkan dari FUNNEL_STAGES,
 * satu sumber kebenaran) + kolom keluar terpisah (Tidak lanjut tidak memakai nomor 6).
 */
export const PIPELINE_BOARD_COLUMNS = [
  ...FUNNEL_STAGES.map((stage) => ({
    key: PIPELINE_KEY_BY_STAGE_ID[stage.id],
    stageId: stage.id as FunnelStageId,
    label: `${stage.id} · ${stage.labelId}`,
    color: stage.color,
    soft: stage.soft,
    defaultStatus: stage.defaultStatus,
    statuses: [...stage.statuses] as string[],
  })),
  {
    key: 'lost',
    /** No stageId number — exit lane, not "tahap 6". */
    stageId: null,
    label: 'Keluar · Tidak lanjut',
    color: '#9a3412',
    soft: 'rgba(154, 52, 18, 0.12)',
    defaultStatus: 'Not Interested',
    statuses: [...LOST_OUTCOME_STATUSES] as string[],
  },
] as const

export type PipelineBoardColumnKey = (typeof PIPELINE_BOARD_COLUMNS)[number]['key']

const STATUS_TO_STAGE = new Map<string, FunnelStageId>(
  FUNNEL_STAGES.flatMap((stage) => stage.statuses.map((status) => [status, stage.id]))
)

export function getFunnelStageId(status: string): FunnelStageId | null {
  return STATUS_TO_STAGE.get(status) ?? null
}

export function getFunnelStage(status: string) {
  const id = getFunnelStageId(status)
  return id ? FUNNEL_STAGES.find((stage) => stage.id === id) ?? null : null
}

export function getStageBadgeClasses(status: string): string {
  if (isLostOutcomeStatus(status)) {
    return 'stage-badge stage-badge-lost'
  }
  const stage = getFunnelStage(status)
  if (!stage) {
    return 'bg-muted text-muted-foreground border-border'
  }
  return `stage-badge stage-badge-${stage.id}`
}

export function isWonStatus(status: string): boolean {
  return (WON_STATUSES as readonly string[]).includes(status)
}

export function isLostOutcomeStatus(status: string): boolean {
  return (LOST_OUTCOME_STATUSES as readonly string[]).includes(status)
}

export function resolveBoardDropStatus(
  currentStatus: string,
  columnKey: string
): string | null {
  const column = PIPELINE_BOARD_COLUMNS.find((c) => c.key === columnKey)
  if (!column) return null
  if (column.statuses.includes(currentStatus)) return currentStatus
  return column.defaultStatus
}

/** Counts per tahap 1–6 (tahap 6 = Closing berhasil only; tidak lanjut tidak dihitung di sini). */
export function countLeadsByFunnelStage(
  leads: { current_status: string }[]
): { stageId: FunnelStageId; count: number }[] {
  return FUNNEL_STAGES.map((stage) => ({
    stageId: stage.id,
    count: leads.filter((lead) => (stage.statuses as readonly string[]).includes(lead.current_status))
      .length,
  }))
}

export function isOwnerLikeRole(role?: string | null): boolean {
  return role === 'owner' || role === 'admin'
}

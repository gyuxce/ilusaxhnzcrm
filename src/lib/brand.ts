/**
 * Harunokaze CRO — product vocabulary & visual stage map (Sprint A / Fase 0).
 *
 * UI-only contract. Does NOT migrate or delete any database data.
 * Existing `current_status` strings remain the source of truth until Fase 5.
 */

export const PRODUCT = {
  name: 'CRM Harunokaze',
  shortName: 'Harunokaze',
  partnership: 'HNZ × Wiwitan',
  taglineId: 'Sistem kerja CRO — jelas, tenang, siap dipakai tim',
  taglineEn: 'CRO workspace — clear, calm, built for the team',
} as const

/** Official daily language for the team (explain in ~30 seconds). */
export const VOCAB = {
  lead: 'Lead',
  pic: 'PIC',
  stage: 'Tahap',
  nextAction: 'Next Action',
  followUp: 'Follow-Up',
  payment: 'Pembayaran',
  lost: 'Lost',
  workToday: 'Hari Ini',
} as const

/**
 * Simplified funnel stages (1–6).
 * Sub-steps stay internal; daily talk uses the stage number + label.
 */
export const FUNNEL_STAGES = [
  {
    id: 1,
    key: 'baru',
    labelId: 'Baru',
    labelEn: 'New',
    meaningId: 'Lead masuk, belum atau baru dihubungi',
    color: 'var(--stage-1)',
    soft: 'var(--stage-1-soft)',
    statuses: ['New Lead', 'Contacted'],
  },
  {
    id: 2,
    key: 'diskusi',
    labelId: 'Diskusi',
    labelEn: 'Discussion',
    meaningId: 'Sedang edukasi / pitching',
    color: 'var(--stage-2)',
    soft: 'var(--stage-2-soft)',
    statuses: ['Pitching', 'Interested'],
  },
  {
    id: 3,
    key: 'pemetaan',
    labelId: 'Pemetaan',
    labelEn: 'Mapping',
    meaningId: 'Assessment / pemetaan berjalan',
    color: 'var(--stage-3)',
    soft: 'var(--stage-3-soft)',
    statuses: [
      'Pemetaan Scheduled',
      'Pemetaan Done',
      'Waiting Result',
      'Result Ready',
      'Sent Result Pemetaan',
      'Placement Test Scheduled',
      'Placement Test Done',
    ],
  },
  {
    id: 4,
    key: 'expert',
    labelId: 'Expert',
    labelEn: 'Expert',
    meaningId: 'Butuh bantuan expert',
    color: 'var(--stage-4)',
    soft: 'var(--stage-4-soft)',
    statuses: ['Expert Consultation Scheduled', 'Expert Consultation Done'],
  },
  {
    id: 5,
    key: 'closing',
    labelId: 'Closing',
    labelEn: 'Closing',
    meaningId: 'Offer seat lock / follow-up closing',
    color: 'var(--stage-5)',
    soft: 'var(--stage-5-soft)',
    statuses: ['Seat Lock Offered', 'Belum Berhasil Closing'],
  },
  {
    id: 6,
    key: 'selesai',
    labelId: 'Selesai',
    labelEn: 'Done',
    meaningId: 'Menang (paid/onboarding) atau kalah (lost)',
    color: 'var(--stage-6)',
    soft: 'var(--stage-6-soft)',
    statuses: [
      'Seat Lock Paid',
      'Onboarding',
      'Class Started',
      'Not Interested',
      'Not Eligible',
    ],
  },
] as const

export type FunnelStageId = (typeof FUNNEL_STAGES)[number]['id']

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
  const stage = getFunnelStage(status)
  if (!stage) {
    return 'bg-muted text-muted-foreground border-border'
  }
  return `stage-badge stage-badge-${stage.id}`
}

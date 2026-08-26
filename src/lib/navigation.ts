/**
 * Information architecture — PRD V3 (3-stage lead flow).
 *
 * Primary menus: Leads → Stage 2 → Stage 3 (Kanban).
 * Legacy routes (work-queue, today, pipeline, needs-action, follow-ups,
 * expert-queue) stay alive for deep-links but are no longer primary nav.
 */

export type NavItem = {
  href: string
  labelId: string
  labelEn: string
  hintId: string
  hintEn: string
}

/**
 * CRO primary nav — kerja lead mengalir dari Leads → Stage 2 → Stage 3.
 */
export const PRIMARY_NAV: NavItem[] = [
  {
    href: '/dashboard',
    labelId: 'Dashboard',
    labelEn: 'Dashboard',
    hintId: 'Ringkasan & laporan pipeline',
    hintEn: 'Pipeline overview & reports',
  },
  {
    href: '/leads',
    labelId: 'Leads',
    labelEn: 'Leads',
    hintId: 'Data master + Kerjakan Stage 1',
    hintEn: 'Master data + Stage 1 work',
  },
  {
    href: '/stage-2',
    labelId: 'Stage 2',
    labelEn: 'Stage 2',
    hintId: 'Lead interested — jadwal pemetaan / expert',
    hintEn: 'Interested leads — schedule mapping / expert',
  },
  {
    href: '/stage-3',
    labelId: 'Stage 3',
    labelEn: 'Stage 3',
    hintId: 'Pipeline Kanban: Pemetaan → Closing',
    hintEn: 'Kanban pipeline: Mapping → Closing',
  },
  {
    href: '/danacita',
    labelId: 'Payment via Danacita',
    labelEn: 'Payment via Danacita',
    hintId: 'Track pengajuan pendanaan Danacita',
    hintEn: 'Track Danacita financing applications',
  },
]

/** Tools nested under Antrian / Hari Ini (routes preserved). */
export const TODAY_TOOLS = [
  {
    href: '/work-queue',
    labelId: 'Kerjaan Hari Ini',
    labelEn: 'Work Queue',
    descId: 'Hubungi lead, catat hasil, pilih next action.',
    descEn: 'Contact leads, log results, pick next action.',
    key: 'work' as const,
  },
  {
    href: '/needs-action',
    labelId: 'Needs Action',
    labelEn: 'Needs Action',
    descId: 'Lead yang menunggu jadwal, hasil, atau closing.',
    descEn: 'Leads waiting on schedule, results, or closing.',
    key: 'needs' as const,
  },
  {
    href: '/follow-ups',
    labelId: 'Follow-Up',
    labelEn: 'Follow-Ups',
    descId: 'Janji follow-up yang jatuh tempo.',
    descEn: 'Follow-ups that are due.',
    key: 'followUps' as const,
  },
  {
    href: '/expert-queue',
    labelId: 'Butuh Expert',
    labelEn: 'Needs Expert',
    descId: 'Lead yang perlu dibantu sensei / program / admin.',
    descEn: 'Leads that need expert / program / admin help.',
    key: 'expert' as const,
  },
]

/**
 * Owner primary nav — pantau pipeline + verifikasi pembayaran.
 */
export const OWNER_PRIMARY_NAV: NavItem[] = [
  {
    href: '/dashboard',
    labelId: 'Dashboard',
    labelEn: 'Dashboard',
    hintId: 'Ringkasan & laporan pipeline',
    hintEn: 'Pipeline overview & reports',
  },
  {
    href: '/leads',
    labelId: 'Leads',
    labelEn: 'Leads',
    hintId: 'Data master lead',
    hintEn: 'Lead master data',
  },
  {
    href: '/stage-2',
    labelId: 'Stage 2',
    labelEn: 'Stage 2',
    hintId: 'Lead interested — jadwal pemetaan / expert',
    hintEn: 'Interested leads — schedule mapping / expert',
  },
  {
    href: '/stage-3',
    labelId: 'Stage 3',
    labelEn: 'Stage 3',
    hintId: 'Pipeline Kanban: Pemetaan → Closing',
    hintEn: 'Kanban pipeline: Mapping → Closing',
  },
  {
    href: '/danacita',
    labelId: 'Payment via Danacita',
    labelEn: 'Payment via Danacita',
    hintId: 'Track pengajuan pendanaan Danacita',
    hintEn: 'Track Danacita financing applications',
  },
  {
    href: '/conversions',
    labelId: 'Pembayaran',
    labelEn: 'Payments',
    hintId: 'Uang masuk verified',
    hintEn: 'Verified payments',
  },
]

export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/stage-3') {
    return pathname.startsWith('/stage-3') || pathname.startsWith('/pipeline')
  }
  if (href === '/stage-2') {
    return pathname.startsWith('/stage-2')
  }
  if (href === '/dashboard') {
    return pathname.startsWith('/dashboard')
  }
  if (href === '/guide') {
    return pathname.startsWith('/guide')
  }
  if (href === '/leads') {
    return pathname.startsWith('/leads')
  }
  if (href === '/conversions') {
    return pathname.startsWith('/conversions')
  }
  return pathname === href || pathname.startsWith(href + '/')
}

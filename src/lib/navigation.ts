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
    href: '/dashboard',
    labelId: 'Laporan',
    labelEn: 'Reports',
    hintId: 'Ringkasan kerja & performa',
    hintEn: 'Work summary & performance',
  },
  {
    href: '/guide',
    labelId: 'Cara pakai',
    labelEn: 'How to use',
    hintId: 'Alur 3 stage, menu, sumber angka',
    hintEn: '3-stage flow, menus, where numbers come from',
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
 * Owner primary nav — pantau pipeline + laporan.
 */
export const OWNER_PRIMARY_NAV: NavItem[] = [
  {
    href: '/dashboard',
    labelId: 'Dashboard',
    labelEn: 'Dashboard',
    hintId: 'Ringkasan klien & tim dalam satu tempat',
    hintEn: 'Client & team summary in one place',
  },
  {
    href: '/stage-3',
    labelId: 'Stage 3',
    labelEn: 'Stage 3',
    hintId: 'Pipeline Kanban: Pemetaan → Closing',
    hintEn: 'Kanban pipeline: Mapping → Closing',
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
    href: '/conversions',
    labelId: 'Pembayaran',
    labelEn: 'Payments',
    hintId: 'Uang masuk verified',
    hintEn: 'Verified payments',
  },
  {
    href: '/guide',
    labelId: 'Cara pakai',
    labelEn: 'How to use',
    hintId: 'Alur 3 stage, menu, sumber angka',
    hintEn: '3-stage flow, menus, where numbers come from',
  },
]

/** Tabs inside Dashboard / Laporan — one menu, many views. */
export const LAPORAN_LINKS = [
  {
    href: '/dashboard',
    labelId: 'Ringkasan',
    labelEn: 'Overview',
  },
  {
    href: '/client-report',
    labelId: 'Laporan Klien',
    labelEn: 'Client Report',
  },
  {
    href: '/reports',
    labelId: 'Report Harian',
    labelEn: 'Daily Report',
  },
  {
    href: '/analytics',
    labelId: 'Performa',
    labelEn: 'Performance',
  },
  {
    href: '/playbook',
    labelId: 'Alasan tidak lanjut',
    labelEn: 'Not continuing',
  },
]

export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/stage-3') {
    // Stage 3 is the PRD pipeline; legacy /pipeline still routes here conceptually.
    return pathname.startsWith('/stage-3') || pathname.startsWith('/pipeline')
  }
  if (href === '/stage-2') {
    return pathname.startsWith('/stage-2')
  }
  if (href === '/work-queue') {
    return pathname.startsWith('/work-queue') || pathname.startsWith('/stage-1')
  }
  if (href === '/today') {
    return (
      pathname === '/today' ||
      pathname.startsWith('/needs-action') ||
      pathname.startsWith('/follow-ups') ||
      pathname.startsWith('/expert-queue')
    )
  }
  if (href === '/dashboard') {
    return (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/client-report') ||
      pathname.startsWith('/reports') ||
      pathname.startsWith('/analytics') ||
      pathname.startsWith('/playbook')
    )
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

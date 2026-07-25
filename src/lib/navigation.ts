/**
 * Information architecture for Harunokaze CRO (Sprint B / Fase 2).
 * Old routes stay alive — this only controls primary navigation & hubs.
 */

export type NavItem = {
  href: string
  labelId: string
  labelEn: string
  hintId: string
  hintEn: string
}

/** Primary sidebar — 5 work surfaces + settings elsewhere. */
export const PRIMARY_NAV: NavItem[] = [
  {
    href: '/today',
    labelId: 'Hari Ini',
    labelEn: 'Today',
    hintId: 'Tempat kerja utama CRO',
    hintEn: 'Main CRO workspace',
  },
  {
    href: '/leads',
    labelId: 'Leads',
    labelEn: 'Leads',
    hintId: 'Data master lead',
    hintEn: 'Lead master data',
  },
  {
    href: '/pipeline',
    labelId: 'Pipeline',
    labelEn: 'Pipeline',
    hintId: 'Pantau tahap 1–6',
    hintEn: 'Monitor stages 1–6',
  },
  {
    href: '/conversions',
    labelId: 'Pembayaran',
    labelEn: 'Payments',
    hintId: 'Uang masuk verified',
    hintEn: 'Verified payments',
  },
  {
    href: '/dashboard',
    labelId: 'Laporan',
    labelEn: 'Reports',
    hintId: 'Ringkasan untuk tim & owner',
    hintEn: 'Summary for team & owners',
  },
]

/** Tools nested under Hari Ini (routes preserved). */
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

/** Secondary links under Laporan. */
export const LAPORAN_LINKS = [
  {
    href: '/dashboard',
    labelId: 'Ringkasan',
    labelEn: 'Overview',
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
    labelId: 'Alasan Gagal',
    labelEn: 'Lost Reasons',
  },
]

export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/today') {
    return (
      pathname === '/today' ||
      pathname.startsWith('/work-queue') ||
      pathname.startsWith('/needs-action') ||
      pathname.startsWith('/follow-ups') ||
      pathname.startsWith('/expert-queue')
    )
  }
  if (href === '/dashboard') {
    return (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/reports') ||
      pathname.startsWith('/analytics') ||
      pathname.startsWith('/playbook')
    )
  }
  if (href === '/leads') {
    return pathname.startsWith('/leads')
  }
  if (href === '/conversions') {
    return pathname.startsWith('/conversions')
  }
  return pathname === href || pathname.startsWith(href + '/')
}

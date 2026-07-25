/**
 * Information architecture — Owner vs CRO menus stay separate.
 * Old routes remain alive; this controls primary navigation & hubs.
 */

export type NavItem = {
  href: string
  labelId: string
  labelEn: string
  hintId: string
  hintEn: string
}

/**
 * CRO primary nav — daily work first, monitoring second.
 */
export const PRIMARY_NAV: NavItem[] = [
  {
    href: '/work-queue',
    labelId: 'Kerjaan',
    labelEn: 'Work desk',
    hintId: 'Langkah 1–5: hubungi → catat → simpan',
    hintEn: 'Steps 1–5: contact → log → save',
  },
  {
    href: '/today',
    labelId: 'Antrian',
    labelEn: 'Queues',
    hintId: 'Needs Action, FU, Butuh Expert',
    hintEn: 'Needs Action, follow-ups, expert help',
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
    hintId: 'Alur, menu, sumber angka Dashboard',
    hintEn: 'Flow, menus, where Dashboard numbers come from',
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
 * Owner primary nav — monitoring first + guide for clients.
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
    href: '/pipeline',
    labelId: 'Pipeline',
    labelEn: 'Pipeline',
    hintId: 'Pantau tahap 1–6',
    hintEn: 'Monitor stages 1–6',
  },
  {
    href: '/leads',
    labelId: 'Leads',
    labelEn: 'Leads',
    hintId: 'Data master lead',
    hintEn: 'Lead master data',
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
    hintId: 'Alur, menu, sumber angka Dashboard',
    hintEn: 'Flow, menus, where Dashboard numbers come from',
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
  if (href === '/work-queue') {
    return pathname.startsWith('/work-queue')
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

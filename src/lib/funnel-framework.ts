export const FUNNEL_STATUS_OPTIONS = [
  'New Lead',
  'Contacted',
  'Pitching',
  'Interested',
  'Pemetaan Scheduled',
  'Pemetaan Done',
  'Waiting Result',
  'Result Ready',
  'Sent Result Pemetaan',
  'Placement Test Scheduled',
  'Placement Test Done',
  'Expert Consultation Scheduled',
  'Expert Consultation Done',
  'Seat Lock Offered',
  'Seat Lock Paid',
  'Belum Berhasil Closing',
  'Onboarding',
  'Not Interested',
  'Not Eligible',
]

export const LEAD_QUALITY_OPTIONS = [
  'Hot',
  'Warm',
  'Cold',
  'Low Intent',
  'Invalid / Tidak Jelas',
]

export const LEAD_SEGMENT_OPTIONS = [
  'Mau berangkat cepat',
  'Masih cari informasi',
  'Budget / biaya',
  'Perlu izin keluarga',
  'Trust / legalitas',
  'Banding kompetitor',
  'Program fit',
  'Eligibility issue',
]

export const ENTRY_CHANNEL_OPTIONS = [
  'Qonek AI CRM',
  'Meta Form / Group',
  'Landing Page',
  'WhatsApp',
  'Offline',
  'Import Sheet',
  'Manual Input',
]

export const NEXT_ACTION_OPTIONS = [
  'First Contact',
  'Follow Up',
  'Kirim Info Program',
  'Kirim Legalitas / Testimoni',
  'Ajak Pemetaan',
  'Tunggu Hasil Pemetaan',
  'Jadwalkan Expert',
  'Offer Seat Lock',
  'Follow Up Closing',
  'Nurturing',
]

export const LEAD_CONDITION_OPTIONS = [
  'Baru masuk belum dihubungi',
  'Sudah dihubungi',
  'Butuh edukasi',
  'Interested',
  'Waiting result',
  'Butuh expert',
  'Ready closing',
  'Stuck',
  'Lost',
]

export const OBJECTION_CATEGORY_OPTIONS = [
  'Budget / biaya',
  'Trust / legalitas',
  'Perlu izin keluarga',
  'Timing / belum siap',
  'Bahasa Jepang',
  'Dokumen / administrasi',
  'Karier / jalur kerja',
  'Program fit',
  'Banding kompetitor',
  'No response',
  'Lainnya',
]

export const SOLUTION_OPTIONS = [
  'Edukasi value program',
  'Kirim info program',
  'Kirim legalitas / testimoni',
  'Offer cicilan / opsi pembayaran',
  'Jadwalkan placement test',
  'Jadwalkan expert consultation',
  'Kirim materi keluarga',
  'Document preparation support',
  'Career mapping',
  'Nurturing',
  'Offer seat lock',
]

export const COMMERCIAL_TYPE_OPTIONS = [
  'Free',
  'Potential Paid',
  'Paid',
]

export const EXPERT_TYPE_OPTIONS = [
  'Sensei Bahasa',
  'Expert Karier',
  'Expert Program',
  'Admin Dokumen',
  'Trust / Legalitas',
]

export interface PipelineStageConfig {
  key: string
  defaultStatus: string
  label: string
  color: string
  bg: string
  border: string
  statuses: string[]
}

export const PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    key: 'new',
    defaultStatus: 'New Lead',
    label: 'New / Contacted',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.08)',
    border: 'rgba(100,116,139,0.18)',
    statuses: ['New Lead', 'Contacted'],
  },
  {
    key: 'pitching',
    defaultStatus: 'Pitching',
    label: 'Pitching / Interested',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.18)',
    statuses: ['Pitching', 'Interested'],
  },
  {
    key: 'pemetaan',
    defaultStatus: 'Pemetaan Scheduled',
    label: 'Pemetaan',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.18)',
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
    key: 'expert',
    defaultStatus: 'Expert Consultation Scheduled',
    label: 'Expert',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.18)',
    statuses: ['Expert Consultation Scheduled', 'Expert Consultation Done'],
  },
  {
    key: 'closing',
    defaultStatus: 'Seat Lock Offered',
    label: 'Closing',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.18)',
    statuses: ['Seat Lock Offered', 'Seat Lock Paid', 'Belum Berhasil Closing', 'Onboarding'],
  },
  {
    key: 'lost',
    defaultStatus: 'Not Interested',
    label: 'Lost',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.18)',
    statuses: ['Not Interested', 'Not Eligible'],
  },
]

export const NEEDS_ACTION_STATUSES = [
  'Pemetaan Scheduled',
  'Waiting Result',
  'Result Ready',
  'Placement Test Scheduled',
  'Placement Test Done',
  'Expert Consultation Scheduled',
  'Seat Lock Offered',
  'Belum Berhasil Closing',
]

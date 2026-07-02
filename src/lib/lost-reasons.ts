export const LOST_REASON_OPTIONS = [
  'Budget / biaya belum masuk',
  'Tidak cocok dengan program Harunokaze',
  'Belum siap berangkat / timing',
  'Perlu diskusi keluarga',
  'Trust / legalitas / masih ragu',
  'Memilih program atau travel lain',
  'Tidak eligible / tidak memenuhi syarat',
  'Tidak respons / sulit dihubungi',
  'Lainnya',
]

export const LOST_REASON_STRATEGY: Record<string, string> = {
  'Budget / biaya belum masuk': 'Follow up dengan opsi cicilan, nominal bertahap, atau edukasi value program.',
  'Tidak cocok dengan program Harunokaze': 'Catat concern program, lalu tawarkan jalur atau batch yang lebih relevan.',
  'Belum siap berangkat / timing': 'Masukkan ke nurturing dan jadwalkan follow up saat timeline lebih dekat.',
  'Perlu diskusi keluarga': 'Kirim materi ringkas untuk keluarga dan tawarkan sesi tanya jawab.',
  'Trust / legalitas / masih ragu': 'Kirim bukti legalitas, testimoni, dan ajak konsultasi singkat.',
  'Memilih program atau travel lain': 'Catat pembanding utama dan evaluasi positioning/benefit Harunokaze.',
  'Tidak eligible / tidak memenuhi syarat': 'Arsipkan sebagai tidak eligible atau arahkan ke syarat persiapan.',
  'Tidak respons / sulit dihubungi': 'Coba variasi jam follow up, lalu pindahkan ke warming list.',
  Lainnya: 'Review manual untuk menemukan pola baru yang perlu dijadikan kategori tetap.',
}

export const LOST_STATUSES = ['Not Interested', 'Not Eligible']

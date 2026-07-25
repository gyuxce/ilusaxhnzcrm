/**
 * Plain-language playbook for team & clients.
 * Answers: how to use menus, what the funnel means, where Dashboard numbers come from.
 */

export const GUIDE = {
  titleId: 'Cara pakai & alur',
  titleEn: 'How to use & flow',
  subtitleId:
    'Panduan lengkap: menu apa saja, alur lead 1–6, dan dari mana angka di Dashboard diambil — supaya tidak ada yang bingung.',
  subtitleEn:
    'Full guide: menus, lead stages 1–6, and where Dashboard numbers come from.',
} as const

export const GUIDE_SECTIONS_ID = [
  {
    id: 'menu',
    title: 'Menu di sidebar — dipakai untuk apa?',
    body: [
      {
        heading: 'Owner / Admin',
        points: [
          'Dashboard — lihat ringkasan & laporan (ada tab di dalamnya).',
          'Pipeline — pantau posisi lead di tahap 1–6 + kolom Keluar.',
          'Leads — data master lead (cari, edit, import).',
          'Pembayaran — uang masuk yang sudah verified.',
          'Cara pakai — halaman ini (panduan).',
          'Pengaturan — ganti nama profil; admin juga bisa atur role user.',
        ],
      },
      {
        heading: 'CRO',
        points: [
          'Kerjaan — meja harian: pilih lead → WhatsApp → isi langkah 1–5 → Simpan.',
          'Antrian — daftar khusus (Needs Action, FU, Butuh Expert).',
          'Leads / Pipeline / Laporan — pantau & data; input chat utama di Kerjaan.',
          'Cara pakai — halaman ini.',
        ],
      },
    ],
  },
  {
    id: 'flow',
    title: 'Alur lead (bahasa sederhana)',
    intro: 'Lead berjalan dari tahap 1 sampai 6. Kalau berhenti di tengah, masuk kolom Keluar — bukan tahap 6.',
    steps: [
      '1 · Baru — lead baru masuk, belum atau baru dihubungi.',
      '2 · Diskusi — lagi ngobrol / pitching.',
      '3 · Pemetaan — assessment / pemetaan berjalan.',
      '4 · Expert — butuh bantuan expert.',
      '5 · Closing — sedang ditawar seat lock / follow-up closing.',
      '6 · Closing berhasil — sudah bayar seat lock / onboarding.',
    ],
    exit:
      'Keluar · Tidak lanjut — lead berhenti (Not Interested / Not Eligible). Bisa dari tahap mana pun. Ini bukan nomor 6.',
    cro:
      'Kerjaan CRO tiap hari: pilih lead di antrian → kirim WA → isi kondisi, kendala, respon, next action, jadwal FU → Simpan. Status & report terisi otomatis dari situ.',
  },
  {
    id: 'dashboard',
    title: 'Dashboard — isi tiap tab & dari mana angkanya',
    intro:
      'Dashboard punya beberapa tab. Semua angka dihitung dari data lead / pembayaran / catatan chat yang sudah tersimpan di CRM — bukan diisi manual di halaman laporan.',
    tabs: [
      {
        name: 'Ringkasan (Overview)',
        items: [
          'Lead masuk hari ini — lead dengan tanggal masuk = hari ini (WIB).',
          'Perlu dihubungi — New Lead + Needs Action + follow-up jatuh tempo.',
          'Stuck / needs action — lead dengan status menunggu jadwal/hasil/closing.',
          'Closing berhasil minggu ini — Seat Lock Paid / Onboarding / Class Started yang update-nya di minggu ini.',
          'Tidak lanjut minggu ini — Not Interested / Not Eligible di minggu ini.',
          'Funnel tahap 1–6 — jumlah lead aktif di tiap tahap (tahap 6 = closing berhasil saja).',
          'Butuh perhatian — lead aktif tanpa update ≥ 3 hari.',
          'Top alasan tidak lanjut — dari catatan chat CRO (kendala) terbaru.',
          'Revenue — total pembayaran verified (pemetaan + seat lock).',
        ],
      },
      {
        name: 'Laporan Klien',
        items: [
          'Versi ringkas untuk owner/klien — total lead, masih aktif, closing berhasil, tidak lanjut.',
          'Funnel 1–6 sama seperti Overview, tanpa jargon antrian harian CRO.',
          'Alasan tidak lanjut — dari field lost reason di data lead.',
        ],
      },
      {
        name: 'Report Harian',
        items: [
          'Diambil dari aktivitas CRM + catatan chat (lead_interventions) pada tanggal yang dipilih.',
          'Filter tanggal / nama CRO mengubah isi report (bukan reload penuh yang lambat).',
          'Dipakai untuk EOD / ringkasan kerja harian tim.',
        ],
      },
      {
        name: 'Performa',
        items: [
          'Total leads, closing berhasil, konversi %, revenue pemetaan & seat lock — dari tabel leads + payments verified.',
          'Tren lead masuk — dihitung dari tanggal lead masuk 6 bulan terakhir.',
          'Top campaign — jumlah lead per source_campaign.',
          'Peringkat CRO — berapa closing berhasil per PIC.',
          'Alasan tidak lanjut — dari lost_reason di lead.',
        ],
      },
      {
        name: 'Alasan tidak lanjut',
        items: [
          'Bukan sekadar status Lost — membaca catatan chat CRO (kendala, respon, expert, follow-up).',
          'Total catatan, kendala terbanyak, perlu dibantu, bisa berbayar — dari lead_interventions.',
          'Pakai untuk evaluasi script / offer / bantuan tim.',
        ],
      },
    ],
  },
  {
    id: 'pipeline-leads',
    title: 'Pipeline, Leads, Pembayaran',
    points: [
      'Pipeline — papan tahap. Drag lead = mengubah status di database. Kolom “Keluar · Tidak lanjut” terpisah dari tahap 6.',
      'Leads — master data. CRO kerja chat dari Kerjaan; edit detail/histori di sini.',
      'Pembayaran — hanya payment dengan status verified. Revenue di Dashboard diambil dari sini.',
    ],
  },
  {
    id: 'faq',
    title: 'Pertanyaan yang sering muncul',
    faqs: [
      {
        q: 'Kenapa angka Dashboard beda dengan Pipeline?',
        a: 'Dashboard merangkum (hari ini / minggu ini / tahap). Pipeline menampilkan lead per kolom status detail. Filter & batas tampil juga bisa beda.',
      },
      {
        q: 'Apa beda tahap 6 dan Tidak lanjut?',
        a: 'Tahap 6 = Closing berhasil (bayar/onboarding). Tidak lanjut = keluar dari funnel, bukan tahap 6.',
      },
      {
        q: 'Angka “Perlu dihubungi” dihitung dari mana?',
        a: 'Gabungan New Lead + status Needs Action + follow-up yang jatuh tempo (belum selesai).',
      },
      {
        q: 'Revenue dari mana?',
        a: 'Hanya dari pembayaran yang statusnya verified di menu Pembayaran.',
      },
      {
        q: 'CRO harus isi apa tiap hari?',
        a: 'Di Kerjaan: setelah WA, isi langkah 1–5 lalu Simpan. Itu yang mengisi Report Harian & alasan tidak lanjut.',
      },
    ],
  },
] as const

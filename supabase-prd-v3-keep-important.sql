-- PRD V3 — bersihkan data lama, TAPI simpan lead penting.
--
-- Lead penting yang DIPERTAHANKAN (salah satu kondisi berikut):
--   1. Punya pembayaran verified (pemetaan / roadmap_session / seat_lock)
--   2. current_status di tahap Pemetaan  (Menunggu jadwal pemetaan / Menunggu hasil pemetaan)
--   3. current_status di tahap Seat Lock (Menunggu pembayaran seat-lock / Jalur Akselerasi /
--      Closing Seat Lock)
--   4. current_status Interested        (Interested to Pemetaan / Interview / Webinar /
--      In-doubt / No Response)
--   5. Punya baris pemetaan atau expert_consultations (sedang dalam proses)
--
-- Semua lead lain dihapus permanen beserta data turunannya
-- (lead_activities, follow_ups, lead_interventions, payments, pemetaan,
--  expert_consultations). Tidak bisa di-rollback — jalankan sekali saja.
--
-- SEBELUM JALANKAN: backup dulu via dashboard Supabase kalau perlu.
-- Setelah jalan, mode uji boleh dimatikan (cookie prd_trial_mode dihapus).

-- 1. Kumpulkan id lead penting ke tabel sementara -------------------------------
create temp table if not exists _keep_ids (id uuid primary key) on commit drop;

delete from _keep_ids;
insert into _keep_ids (id)
select l.id from leads l
where true
  and (
    exists (select 1 from payments p where p.lead_id = l.id and p.verification_status = 'verified')
    or l.current_status in (
      'Menunggu jadwal pemetaan',
      'Menunggu hasil pemetaan',
      'Menunggu pembayaran seat-lock',
      'Jalur Akselerasi',
      'Closing Seat Lock',
      'Interested to Pemetaan',
      'Interested to Interview',
      'Interested in Webinar',
      'In-doubt',
      'No Response'
    )
    or exists (select 1 from pemetaan pm where pm.lead_id = l.id)
    or exists (select 1 from expert_consultations ec where ec.lead_id = l.id)
  );

-- 2. Hapus child rows milik lead yang TIDAK dipertahankan ----------------------
-- (Aman kalau FK tidak ON DELETE CASCADE; kalau sudah CASCADE, baris ini no-op.)

delete from lead_activities
  where lead_id not in (select id from _keep_ids);

delete from follow_ups
  where lead_id not in (select id from _keep_ids);

delete from lead_interventions
  where lead_id not in (select id from _keep_ids);

delete from payments
  where lead_id not in (select id from _keep_ids);

delete from pemetaan
  where lead_id not in (select id from _keep_ids);

delete from expert_consultations
  where lead_id not in (select id from _keep_ids);

-- 3. Hapus lead-nya -------------------------------------------------------------
delete from leads
  where id not in (select id from _keep_ids);

-- 4. Sanity check ---------------------------------------------------------------
-- select count(*) as kept_leads from leads;
-- select current_status, count(*)
--   from leads
--  group by current_status
--  order by 2 desc;

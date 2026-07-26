-- PRD V3 — hapus lead dengan current_status = 'Pitching' (data lama / legacy).
--
-- Lead Pitching adalah sisa import lama yang belum dikonversi ke alur PRD V3.
-- Dihapus permanen beserta child rows-nya. Jalankan sekali saja.
--
-- SEBELUM JALANKAN: backup dulu via dashboard Supabase kalau perlu.

-- 1. Kumpulkan id lead Pitching ke tabel sementara ----------------------------
create temp table if not exists _pitch_ids (id uuid primary key) on commit drop;

delete from _pitch_ids;
insert into _pitch_ids (id)
select id from leads where current_status = 'Pitching';

-- 2. Hapus child rows milik lead Pitching -------------------------------------
-- (Aman kalau FK tidak ON DELETE CASCADE; kalau sudah CASCADE, baris ini no-op.)

delete from lead_activities      where lead_id in (select id from _pitch_ids);
delete from follow_ups           where lead_id in (select id from _pitch_ids);
delete from lead_interventions   where lead_id in (select id from _pitch_ids);
delete from payments             where lead_id in (select id from _pitch_ids);
delete from pemetaan             where lead_id in (select id from _pitch_ids);
delete from expert_consultations where lead_id in (select id from _pitch_ids);

-- 3. Hapus lead-nya -----------------------------------------------------------
delete from leads where id in (select id from _pitch_ids);

-- 4. Sanity check -------------------------------------------------------------
-- select count(*) as remaining_leads from leads;
-- select current_status, count(*)
--   from leads
--  group by current_status
--  order by 2 desc;

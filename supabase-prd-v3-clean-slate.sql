-- PRD V3 clean slate: hapus SEMUA lead + data transaksional terkait.
-- Aman dijalankan karena data lead di CRM ini hanya hasil import (bukan data
-- permanen). Users (PIC / akun login) TIDAK dihapus.
--
-- Jalankan di Supabase SQL Editor HANYA kalau kamu mau mulai bersih.
-- Urutan hapus menghormati FK / dependensi.

begin;

-- 1. Data transaksional yang nge-link ke leads
delete from public.lead_interventions;
delete from public.follow_ups;
delete from public.lead_activities;
delete from public.payments;
delete from public.pemetaan;
delete from public.expert_consultations;

-- 2. Batch targets (target seat-lock) — opsional, komentar baris ini kalau mau simpan
-- delete from public.batch_targets;

-- 3. Leads itu sendiri
delete from public.leads;

-- 4. Reset sequence id kalau ada (aman kalau tidak ada)
-- alter sequence public.leads_id_seq restart with 1;

commit;

-- Sanity check (jalankan manual setelahnya):
--   select count(*) as total_leads from leads;            -- harus 0
--   select count(*) as total_users from users;            -- harus tetap (PIC & login)
--   select id, name, email, role from users order by name;

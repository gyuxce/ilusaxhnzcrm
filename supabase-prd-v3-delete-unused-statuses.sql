-- PRD V3 — hapus lead yang sudah tidak terpakai:
--   - Input Manual / New Lead (legacy)
--   - Not Interested
--   - Not Eligible
--
-- Permanen + child rows. Jalankan sekali di Supabase SQL Editor.
-- SEBELUM: backup kalau perlu.

create temp table if not exists _drop_ids (id uuid primary key) on commit drop;

delete from _drop_ids;
insert into _drop_ids (id)
select id from leads
where current_status in (
  'Input Manual',
  'New Lead',
  'Not Interested',
  'Not Eligible'
);

-- Child rows (aman jika FK sudah CASCADE)
delete from lead_activities      where lead_id in (select id from _drop_ids);
delete from follow_ups           where lead_id in (select id from _drop_ids);
delete from lead_interventions   where lead_id in (select id from _drop_ids);
delete from payments             where lead_id in (select id from _drop_ids);
delete from pemetaan             where lead_id in (select id from _drop_ids);
delete from expert_consultations where lead_id in (select id from _drop_ids);

delete from leads where id in (select id from _drop_ids);

-- Sanity:
-- select current_status, count(*) from leads group by 1 order by 2 desc;
-- select count(*) from leads;

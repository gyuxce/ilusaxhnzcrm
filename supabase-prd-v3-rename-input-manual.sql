-- Rename legacy status "New Lead" → "Input Manual" (PRD V3).
-- Jalankan sekali di Supabase SQL editor.

update leads
set current_status = 'Input Manual'
where current_status = 'New Lead';

-- Sanity:
-- select current_status, count(*) from leads group by 1 order by 2 desc;

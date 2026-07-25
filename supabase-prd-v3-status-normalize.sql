-- PRD V3 cutover: normalize legacy current_status → PRD stage statuses.
-- Non-destructive: backs up old status to legacy_status, logs every change
-- to lead_activities. Reversible via the rollback block at the bottom.
--
-- Run order:
--   1) supabase-prd-v3-status-normalize.sql   (this file)
--   2) (optional) supabase-prd-v3-status-rollback.sql  (if you need to revert)

-- 1. Backup column (add if missing) -----------------------------------------------
alter table leads
  add column if not exists legacy_status text;

create index if not exists idx_leads_legacy_status
  on leads (legacy_status);

-- 2. Normalize current_status -----------------------------------------------------
-- Mapping rationale (PRD V3):
--   Stage 1  : New Lead / Bridging / Pitching  (+ exits Not Interested / Not Eligible)
--   Stage 2  : Interested to Pemetaan/Interview/Webinar, In-doubt, No Response
--   Stage 3  : Menunggu jadwal pemetaan / hasil pemetaan / expert consultation /
--              pembayaran seat-lock / Jalur Akselerasi / Closing Seat Lock /
--              Cold Leads / Failed

update leads set legacy_status = current_status
  where legacy_status is null;

update leads set current_status = 'New Lead'
  where current_status in ('New Lead');

update leads set current_status = 'Bridging'
  where current_status in ('Contacted');

update leads set current_status = 'Pitching'
  where current_status in ('Pitching');

update leads set current_status = 'Interested to Pemetaan'
  where current_status in ('Interested');

update leads set current_status = 'Menunggu jadwal pemetaan'
  where current_status in ('Pemetaan Scheduled');

update leads set current_status = 'Menunggu hasil pemetaan'
  where current_status in ('Pemetaan Done', 'Waiting Result');

update leads set current_status = 'Menunggu jadwal expert consultation'
  where current_status in (
    'Result Ready', 'Sent Result Pemetaan',
    'Placement Test Scheduled', 'Placement Test Done',
    'Expert Consultation Scheduled'
  );

update leads set current_status = 'Menunggu pembayaran seat-lock'
  where current_status in (
    'Expert Consultation Done',
    'Seat Lock Offered',
    'Belum Berhasil Closing'
  );

update leads set current_status = 'Closing Seat Lock'
  where current_status in ('Seat Lock Paid', 'Onboarding', 'Class Started');

-- Not Interested / Not Eligible stay as Stage 1 exits (PRD A.2 hasil follow-up).

-- 3. Activity log (one row per changed lead) -------------------------------------
-- Best-effort: uses current legacy_status snapshot. Safe to re-run.
insert into lead_activities (lead_id, activity_type, description)
select id, 'PRD V3 migrate', 'Status lama ' || legacy_status || ' → ' || current_status
from leads
where legacy_status is not null
  and legacy_status <> current_status
on conflict do nothing;

-- 4. Sanity check -----------------------------------------------------------------
-- Counts after migration (run manually to verify):
--   select current_status, count(*) from leads group by current_status order by 2 desc;

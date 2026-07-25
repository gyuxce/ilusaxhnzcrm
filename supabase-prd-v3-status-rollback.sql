-- PRD V3 rollback: restore legacy current_status from backup column.
-- Only works if supabase-prd-v3-status-normalize.sql was run.
-- Does NOT delete the lead_activities rows written by the migration
-- (they are harmless history); drop them manually if desired.

update leads
  set current_status = legacy_status
  where legacy_status is not null;

-- Optional: drop the backup column once you are confident.
-- alter table leads drop column if exists legacy_status;
-- drop index if exists idx_leads_legacy_status;

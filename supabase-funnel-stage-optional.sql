-- ============================================================
-- OPTIONAL / ADDITIVE ONLY — Harunokaze funnel_stage helper
-- Sprint D (Fase 5). Does NOT drop tables or delete lead rows.
--
-- `current_status` remains the operational source of truth.
-- `funnel_stage` (1–6) is a derived convenience column for reporting.
-- Run manually in Supabase SQL Editor only if you want the column.
-- ============================================================

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS funnel_stage SMALLINT;

COMMENT ON COLUMN public.leads.funnel_stage IS
  'Derived stage 1-6 mapped from current_status. Optional helper; do not delete current_status.';

-- Backfill from existing current_status (safe UPDATE, no deletes)
UPDATE public.leads SET funnel_stage = CASE
  WHEN current_status IN ('New Lead', 'Contacted') THEN 1
  WHEN current_status IN ('Pitching', 'Interested') THEN 2
  WHEN current_status IN (
    'Pemetaan Scheduled', 'Pemetaan Done', 'Waiting Result', 'Result Ready',
    'Sent Result Pemetaan', 'Placement Test Scheduled', 'Placement Test Done'
  ) THEN 3
  WHEN current_status IN ('Expert Consultation Scheduled', 'Expert Consultation Done') THEN 4
  WHEN current_status IN ('Seat Lock Offered', 'Belum Berhasil Closing') THEN 5
  WHEN current_status IN (
    'Seat Lock Paid', 'Onboarding', 'Class Started', 'Not Interested', 'Not Eligible'
  ) THEN 6
  ELSE funnel_stage
END
WHERE funnel_stage IS NULL
   OR funnel_stage NOT BETWEEN 1 AND 6;

CREATE INDEX IF NOT EXISTS idx_leads_funnel_stage ON public.leads (funnel_stage);

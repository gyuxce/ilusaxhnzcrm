-- Safe additive funnel framework fields.
-- Run this in Supabase SQL Editor before deploying the CRM update.
-- This does not delete, truncate, or overwrite existing lead data.

alter table public.leads
  add column if not exists lead_quality text,
  add column if not exists lead_segment text,
  add column if not exists entry_channel text,
  add column if not exists next_action text,
  add column if not exists next_follow_up_date date,
  add column if not exists funnel_notes text;

create index if not exists leads_lead_quality_idx on public.leads (lead_quality);
create index if not exists leads_lead_segment_idx on public.leads (lead_segment);
create index if not exists leads_next_follow_up_date_idx on public.leads (next_follow_up_date);

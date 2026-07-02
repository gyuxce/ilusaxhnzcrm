-- Safe additive table for CRO handling / objection / intervention logs.
-- Run this in Supabase SQL Editor before using the Objection & Intervention Log UI.
-- This does not delete, truncate, or overwrite existing data.

create table if not exists public.lead_interventions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  created_by uuid references public.users(id) on delete set null,
  lead_condition text,
  objection_category text,
  solution_given text,
  expert_needed boolean not null default false,
  expert_type text,
  commercial_type text,
  service_opportunity text,
  next_action text,
  next_follow_up_date date,
  result text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_interventions_lead_id_idx on public.lead_interventions(lead_id);
create index if not exists lead_interventions_created_by_idx on public.lead_interventions(created_by);
create index if not exists lead_interventions_created_at_idx on public.lead_interventions(created_at);
create index if not exists lead_interventions_objection_idx on public.lead_interventions(objection_category);
create index if not exists lead_interventions_commercial_idx on public.lead_interventions(commercial_type);

grant select, insert, update, delete on public.lead_interventions to authenticated;

alter table public.lead_interventions enable row level security;

drop policy if exists "lead_interventions_select_authenticated" on public.lead_interventions;
drop policy if exists "lead_interventions_insert_authenticated" on public.lead_interventions;
drop policy if exists "lead_interventions_update_authenticated" on public.lead_interventions;
drop policy if exists "lead_interventions_delete_authenticated" on public.lead_interventions;

create policy "lead_interventions_select_authenticated"
on public.lead_interventions
for select
to authenticated
using (true);

create policy "lead_interventions_insert_authenticated"
on public.lead_interventions
for insert
to authenticated
with check (true);

create policy "lead_interventions_update_authenticated"
on public.lead_interventions
for update
to authenticated
using (true)
with check (true);

create policy "lead_interventions_delete_authenticated"
on public.lead_interventions
for delete
to authenticated
using (true);

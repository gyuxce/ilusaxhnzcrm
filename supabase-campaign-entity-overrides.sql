-- Campaign -> Entity (HNZ/KFI) manual mapping.
-- source_campaign is free text (no dropdown at lead creation), so a keyword
-- guess ("driver" -> KFI) is fragile. This table lets an admin explicitly
-- assign each campaign name that has actually appeared, from Settings.
-- Dashboard falls back to the keyword guess only for campaigns not yet
-- listed here.

create table if not exists public.campaign_entity_overrides (
  source_campaign text primary key,
  entity text not null check (entity in ('HNZ', 'KFI')),
  updated_by uuid references public.users(id),
  updated_at timestamptz not null default now()
);

alter table public.campaign_entity_overrides enable row level security;

drop policy if exists "Allow all for authenticated users on campaign_entity_overrides" on public.campaign_entity_overrides;

create policy "Allow all for authenticated users on campaign_entity_overrides"
  on public.campaign_entity_overrides
  for all
  to authenticated
  using (true)
  with check (true);

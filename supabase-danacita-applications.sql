-- "Payment via Danacita" tracking module.
-- A lead at Stage 3 "Menunggu pembayaran seat-lock" can be routed to apply
-- for Dana Cita financing instead of paying Harunokaze directly. This table
-- tracks that application end to end (label, review status, SLA timestamp)
-- since it's a manual/human-in-the-loop process coordinated with Dana Cita's
-- team via WhatsApp/group chat, not an automated integration.
--
-- flow: 'hot' = CRO actively directed the lead to apply; 'cold' = lead
-- applied on their own (current_status was already Cold Leads at intake).
-- Stored as a snapshot at creation time, not derived, since the lead's
-- status can change afterwards.

create table if not exists public.danacita_applications (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  flow text not null check (flow in ('hot', 'cold')),
  label text not null check (label in ('pendidikan', 'keberangkatan', 'pendidikan_keberangkatan')),
  status text not null default 'sedang_ditinjau' check (status in ('sedang_ditinjau', 'tidak_eligible', 'berhasil', 'lainnya')),
  status_reason text,
  last_status_changed_at timestamptz not null default now(),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists danacita_applications_lead_id_idx on public.danacita_applications(lead_id);

alter table public.danacita_applications enable row level security;

drop policy if exists "Allow all for authenticated users on danacita_applications" on public.danacita_applications;

create policy "Allow all for authenticated users on danacita_applications"
  on public.danacita_applications
  for all
  to authenticated
  using (true)
  with check (true);

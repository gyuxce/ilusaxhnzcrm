-- Fix RPC ambiguity for lead edit.
-- Safe to run: this only creates/replaces functions and grants execute.
-- It does not delete or update lead data.

create or replace function public.update_lead_core_fast_v2(
  p_lead_id uuid,
  p_full_name text,
  p_whatsapp_number text,
  p_email text default null,
  p_source_campaign text default null,
  p_current_status text default 'New Lead',
  p_assigned_cro_id uuid default null,
  p_notes text default null,
  p_lost_reason text default null,
  p_lead_entry_date timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  clean_phone text := public.normalize_whatsapp(p_whatsapp_number);
  duplicate_record public.leads%rowtype;
  old_status text;
begin
  if char_length(clean_phone) < 9 or char_length(clean_phone) > 15 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_PHONE', 'message', 'Nomor WhatsApp tidak valid.');
  end if;

  select *
  into duplicate_record
  from public.leads
  where whatsapp_normalized = clean_phone
    and duplicate_of is null
    and id <> p_lead_id
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', false,
      'code', 'DUPLICATE_PHONE',
      'message', 'Nomor WhatsApp ini sudah terdaftar.',
      'duplicate_lead', jsonb_build_object(
        'id', duplicate_record.id,
        'full_name', duplicate_record.full_name,
        'source_campaign', duplicate_record.source_campaign,
        'current_status', duplicate_record.current_status
      )
    );
  end if;

  select current_status
  into old_status
  from public.leads
  where id = p_lead_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Lead tidak ditemukan.');
  end if;

  update public.leads
  set
    full_name = p_full_name,
    whatsapp_number = clean_phone,
    whatsapp_normalized = clean_phone,
    email = nullif(p_email, ''),
    source_campaign = p_source_campaign,
    current_status = coalesce(nullif(p_current_status, ''), 'New Lead'),
    assigned_cro_id = p_assigned_cro_id,
    notes = nullif(p_notes, ''),
    lost_reason = nullif(p_lost_reason, ''),
    lead_entry_date = coalesce(p_lead_entry_date, lead_entry_date),
    updated_by = actor_id,
    updated_at = now()
  where id = p_lead_id;

  if old_status <> coalesce(nullif(p_current_status, ''), 'New Lead') then
    insert into public.lead_activities (lead_id, activity_type, description, created_by)
    values (
      p_lead_id,
      'Status changed',
      'Status changed from ' || old_status || ' to ' || coalesce(nullif(p_current_status, ''), 'New Lead') || ' via manual edit',
      actor_id
    );
  else
    insert into public.lead_activities (lead_id, activity_type, description, created_by)
    values (p_lead_id, 'Lead Updated', 'Core lead information updated manually', actor_id);
  end if;

  return jsonb_build_object('ok', true, 'id', p_lead_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE', 'message', 'Nomor WhatsApp ini sudah terdaftar.');
end;
$$;

grant execute on function public.update_lead_core_fast_v2(uuid, text, text, text, text, text, uuid, text, text, timestamptz) to authenticated;

-- Keep the old RPC name working for any cached deployment/browser bundle.
-- The ambiguity came from old overloads with the same argument names.
-- These drops remove only function definitions, not data.
drop function if exists public.update_lead_core_fast(uuid, text, text, text, text, text, uuid, text, text);
drop function if exists public.update_lead_core_fast(uuid, text, text, text, text, text, uuid, text, text, date);

create or replace function public.update_lead_core_fast(
  p_lead_id uuid,
  p_full_name text,
  p_whatsapp_number text,
  p_email text default null,
  p_source_campaign text default null,
  p_current_status text default 'New Lead',
  p_assigned_cro_id uuid default null,
  p_notes text default null,
  p_lost_reason text default null,
  p_lead_entry_date timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.update_lead_core_fast_v2(
    p_lead_id,
    p_full_name,
    p_whatsapp_number,
    p_email,
    p_source_campaign,
    p_current_status,
    p_assigned_cro_id,
    p_notes,
    p_lost_reason,
    p_lead_entry_date
  );
end;
$$;

grant execute on function public.update_lead_core_fast(uuid, text, text, text, text, text, uuid, text, text, timestamptz) to authenticated;

notify pgrst, 'reload schema';

select oid::regprocedure as remaining_update_lead_core_fast_function
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname = 'update_lead_core_fast'
order by oid::regprocedure::text;

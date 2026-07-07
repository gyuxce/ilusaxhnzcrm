-- Safe additive performance helpers for lead create/update.
-- This file does not delete, truncate, or mass-update existing data.
-- Run in Supabase SQL Editor when you want create/edit lead to be handled in one database transaction.

create or replace function public.normalize_whatsapp(value text)
returns text
language plpgsql
immutable
as $$
declare
  clean_phone text;
begin
  clean_phone := regexp_replace(coalesce(value, ''), '\D', '', 'g');

  if clean_phone like '0%' then
    clean_phone := '62' || substring(clean_phone from 2);
  elsif clean_phone like '8%' then
    clean_phone := '62' || clean_phone;
  end if;

  return clean_phone;
end;
$$;

create or replace function public.create_lead_fast(
  p_full_name text,
  p_whatsapp_number text,
  p_email text default null,
  p_source_campaign text default null,
  p_lead_type text default 'inbound',
  p_current_status text default 'New Lead',
  p_assigned_cro_id uuid default null,
  p_notes text default null,
  p_lead_entry_date timestamptz default now()
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
  inserted_lead_id uuid;
begin
  if char_length(clean_phone) < 9 or char_length(clean_phone) > 15 then
    return jsonb_build_object('ok', false, 'code', 'INVALID_PHONE', 'message', 'Nomor WhatsApp tidak valid.');
  end if;

  select *
  into duplicate_record
  from public.leads
  where whatsapp_normalized = clean_phone
    and duplicate_of is null
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

  insert into public.leads (
    full_name,
    whatsapp_number,
    whatsapp_normalized,
    email,
    source_campaign,
    lead_type,
    current_status,
    assigned_cro_id,
    notes,
    lead_entry_date,
    created_by,
    updated_by
  )
  values (
    p_full_name,
    clean_phone,
    clean_phone,
    nullif(p_email, ''),
    p_source_campaign,
    coalesce(nullif(p_lead_type, ''), 'inbound'),
    coalesce(nullif(p_current_status, ''), 'New Lead'),
    p_assigned_cro_id,
    nullif(p_notes, ''),
    coalesce(p_lead_entry_date, now()),
    actor_id,
    actor_id
  )
  returning id into inserted_lead_id;

  insert into public.pemetaan (lead_id, form_status, result_status)
  values (inserted_lead_id, 'not_sent', 'not_ready');

  insert into public.lead_activities (lead_id, activity_type, description, created_by)
  values (inserted_lead_id, 'Lead created', 'Lead created manually via Tambah Lead form', actor_id);

  return jsonb_build_object('ok', true, 'id', inserted_lead_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'DUPLICATE_PHONE', 'message', 'Nomor WhatsApp ini sudah terdaftar.');
end;
$$;

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
    values (p_lead_id, 'Status changed', 'Status changed from ' || old_status || ' to ' || coalesce(nullif(p_current_status, ''), 'New Lead') || ' via manual edit', actor_id);
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

grant execute on function public.normalize_whatsapp(text) to authenticated;
grant execute on function public.create_lead_fast(text, text, text, text, text, text, uuid, text, timestamptz) to authenticated;
grant execute on function public.update_lead_core_fast(uuid, text, text, text, text, text, uuid, text, text, timestamptz) to authenticated;

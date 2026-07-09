-- Atomic save for Work Queue (Kerjaan Hari Ini).
-- Run in Supabase SQL Editor before using the transactional save path.
-- Requires public.lead_interventions table (see supabase-lead-interventions.sql).

create or replace function public.save_work_queue_fast(
  p_lead_id uuid,
  p_current_status text,
  p_next_status text,
  p_lead_condition text,
  p_objection_category text,
  p_solution_given text,
  p_expert_needed boolean default false,
  p_expert_type text default null,
  p_commercial_type text default 'Free',
  p_service_opportunity text default null,
  p_next_action text default null,
  p_next_follow_up_date date default null,
  p_result text default null,
  p_notes text default null,
  p_funnel_notes text default null,
  p_follow_up_id uuid default null,
  p_complete_follow_up boolean default false,
  p_close_lead boolean default false,
  p_lost_status text default null,
  p_lost_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  intervention_id uuid;
  activity_desc text;
  fu_done_result text;
  resolved_next_status text;
begin
  if p_lead_id is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT', 'message', 'Lead ID wajib diisi.');
  end if;

  if not exists (select 1 from public.leads where id = p_lead_id) then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Lead tidak ditemukan.');
  end if;

  if coalesce(trim(p_lead_condition), '') = ''
     or coalesce(trim(p_objection_category), '') = ''
     or coalesce(trim(p_solution_given), '') = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT', 'message', 'Kondisi lead, objection, dan solusi wajib diisi.');
  end if;

  if coalesce(p_close_lead, false) then
    if coalesce(trim(p_lost_status), '') not in ('Not Interested', 'Not Eligible') then
      return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT', 'message', 'Status tutup lead harus Not Interested atau Not Eligible.');
    end if;

    if coalesce(trim(p_lost_reason), '') = '' then
      return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT', 'message', 'Alasan lost wajib diisi saat menutup lead.');
    end if;
  elsif coalesce(trim(p_next_action), '') = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT', 'message', 'Kondisi lead, objection, solusi, dan next action wajib diisi.');
  end if;

  insert into public.lead_interventions (
    lead_id,
    created_by,
    lead_condition,
    objection_category,
    solution_given,
    expert_needed,
    expert_type,
    commercial_type,
    service_opportunity,
    next_action,
    next_follow_up_date,
    result,
    notes
  )
  values (
    p_lead_id,
    actor_id,
    p_lead_condition,
    p_objection_category,
    p_solution_given,
    case when coalesce(p_close_lead, false) then false else coalesce(p_expert_needed, false) end,
    case when coalesce(p_close_lead, false) then null when coalesce(p_expert_needed, false) then nullif(p_expert_type, '') else null end,
    coalesce(nullif(p_commercial_type, ''), 'Free'),
    nullif(p_service_opportunity, ''),
    case when coalesce(p_close_lead, false) then 'Tutup Lead' else p_next_action end,
    case when coalesce(p_close_lead, false) then null else p_next_follow_up_date end,
    nullif(p_result, ''),
    nullif(p_notes, '')
  )
  returning id into intervention_id;

  resolved_next_status := case
    when coalesce(p_close_lead, false) then p_lost_status
    else coalesce(nullif(p_next_status, ''), p_current_status)
  end;

  update public.leads
  set
    current_status = resolved_next_status,
    lost_reason = case when coalesce(p_close_lead, false) then nullif(p_lost_reason, '') else lost_reason end,
    lead_segment = p_objection_category,
    next_action = case when coalesce(p_close_lead, false) then null else p_next_action end,
    next_follow_up_date = case when coalesce(p_close_lead, false) then null else p_next_follow_up_date end,
    funnel_notes = coalesce(nullif(p_funnel_notes, ''), funnel_notes),
    last_contacted_date = now(),
    updated_by = actor_id,
    updated_at = now()
  where id = p_lead_id;

  activity_desc := p_lead_condition || ' | Objection: ' || p_objection_category || ' | Solusi: ' || p_solution_given;

  insert into public.lead_activities (lead_id, activity_type, description, created_by)
  values (p_lead_id, 'Intervention Logged', activity_desc, actor_id);

  if coalesce(p_current_status, '') <> coalesce(resolved_next_status, '') then
    insert into public.lead_activities (lead_id, activity_type, description, created_by)
    values (
      p_lead_id,
      'Status changed',
      p_current_status || ' -> ' || resolved_next_status || case when coalesce(p_close_lead, false) then ' (tutup lead)' else ' via Work Queue' end,
      actor_id
    );
  end if;

  if coalesce(p_close_lead, false) then
    update public.follow_ups
    set
      is_done = true,
      done_at = now(),
      result = coalesce(nullif(p_result, ''), 'Lead ditutup: ' || p_lost_status),
      updated_at = now()
    where lead_id = p_lead_id
      and is_done = false;

    insert into public.lead_activities (lead_id, activity_type, description, created_by)
    values (
      p_lead_id,
      'Lead Closed',
      resolved_next_status || ' — ' || p_lost_reason,
      actor_id
    );
  else
    if p_next_follow_up_date is not null then
      insert into public.follow_ups (
        lead_id,
        scheduled_date,
        fu_type,
        notes,
        pic_id
      )
      values (
        p_lead_id,
        p_next_follow_up_date,
        'whatsapp',
        coalesce(nullif(p_notes, ''), nullif(p_result, ''), 'Next action: ' || p_next_action),
        actor_id
      );
    end if;
  end if;

  if p_follow_up_id is not null and coalesce(p_complete_follow_up, false) then
    fu_done_result := coalesce(nullif(p_result, ''), nullif(p_notes, ''), 'Selesai via Work Queue');

    update public.follow_ups
    set
      is_done = true,
      done_at = now(),
      result = fu_done_result,
      updated_at = now()
    where id = p_follow_up_id
      and lead_id = p_lead_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'lead_id', p_lead_id,
    'intervention_id', intervention_id,
    'closed', coalesce(p_close_lead, false)
  );
exception
  when others then
    return jsonb_build_object(
      'ok', false,
      'code', 'SAVE_FAILED',
      'message', SQLERRM
    );
end;
$$;

grant execute on function public.save_work_queue_fast(
  uuid, text, text, text, text, text, boolean, text, text, text, text, date, text, text, text, uuid, boolean, boolean, text, text
) to authenticated;

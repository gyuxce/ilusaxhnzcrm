-- Atomic save for Needs Action dashboard actions.
-- Run in Supabase SQL Editor. Safe: does not delete or truncate existing data.

create or replace function public.apply_needs_action_fast(
  p_lead_id uuid,
  p_action_type text,
  p_input_val text default null,
  p_input_val2 text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  next_status text;
  activity_desc text;
  expert_id uuid;
begin
  if p_lead_id is null then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT', 'message', 'Lead ID wajib diisi.');
  end if;

  if not exists (select 1 from public.leads where id = p_lead_id) then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Lead tidak ditemukan.');
  end if;

  if coalesce(trim(p_action_type), '') = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT', 'message', 'Action type wajib diisi.');
  end if;

  next_status := null;
  activity_desc := null;

  if p_action_type = 'set_waiting_result' then
    next_status := 'Waiting Result';
    activity_desc := 'Lead moved to Waiting Result via Needs Action dashboard';

    if not exists (select 1 from public.pemetaan where lead_id = p_lead_id) then
      insert into public.pemetaan (lead_id, form_status, result_status)
      values (p_lead_id, 'not_sent', 'waiting');
    else
      update public.pemetaan
      set result_status = 'waiting', updated_at = now()
      where lead_id = p_lead_id;
    end if;

  elsif p_action_type = 'send_result' then
    next_status := 'Sent Result Pemetaan';
    activity_desc := 'Hasil Pemetaan dikirim: ' || coalesce(nullif(p_input_val, ''), 'Sukses');

    if not exists (select 1 from public.pemetaan where lead_id = p_lead_id) then
      insert into public.pemetaan (
        lead_id, form_status, result_status, result_ready_at, completed_at, result_notes
      )
      values (
        p_lead_id, 'submitted', 'ready', now(), now(), nullif(p_input_val, '')
      );
    else
      update public.pemetaan
      set
        result_status = 'ready',
        result_ready_at = now(),
        completed_at = now(),
        result_notes = nullif(p_input_val, ''),
        updated_at = now()
      where lead_id = p_lead_id;
    end if;

  elsif p_action_type = 'schedule_expert' then
    if coalesce(trim(p_input_val), '') = '' or coalesce(trim(p_input_val2), '') = '' then
      return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT', 'message', 'Jadwal dan nama expert wajib diisi.');
    end if;

    next_status := 'Expert Consultation Scheduled';
    activity_desc := 'Expert consultation scheduled for ' || p_input_val || ' with expert: ' || p_input_val2;

    select id into expert_id
    from public.expert_consultations
    where lead_id = p_lead_id
    limit 1;

    if expert_id is null then
      insert into public.expert_consultations (lead_id, scheduled_at, expert_name)
      values (p_lead_id, p_input_val::timestamptz, p_input_val2);
    else
      update public.expert_consultations
      set
        scheduled_at = p_input_val::timestamptz,
        expert_name = p_input_val2,
        updated_at = now()
      where id = expert_id;
    end if;

  elsif p_action_type = 'offer_seat_lock' then
    next_status := 'Seat Lock Offered';
    activity_desc := 'Seat Lock Offered';

  elsif p_action_type = 'pay_seat_lock' then
    if coalesce(trim(p_input_val), '') = '' then
      return jsonb_build_object('ok', false, 'code', 'INVALID_INPUT', 'message', 'Nominal seat lock wajib diisi.');
    end if;

    next_status := 'Seat Lock Paid';
    activity_desc := 'Seat lock paid: Rp ' || to_char(p_input_val::numeric, 'FM999,999,999') || ' (' || coalesce(p_input_val2, '-') || ')';

    insert into public.payments (
      lead_id,
      payment_type,
      amount,
      payment_method,
      payment_date,
      verification_status,
      verified_at,
      verified_by,
      notes
    )
    values (
      p_lead_id,
      'seat_lock',
      p_input_val::numeric,
      'Transfer',
      current_date,
      'verified',
      now(),
      actor_id,
      'Verified on Seat Lock Paid Action: ' || coalesce(p_input_val2, '-')
    );

  else
    return jsonb_build_object('ok', false, 'code', 'INVALID_ACTION', 'message', 'Action type tidak dikenal: ' || p_action_type);
  end if;

  if next_status is not null then
    update public.leads
    set
      current_status = next_status,
      updated_by = actor_id,
      updated_at = now()
    where id = p_lead_id;

    insert into public.lead_activities (lead_id, activity_type, description, created_by)
    values (p_lead_id, 'Status changed', activity_desc, actor_id);
  end if;

  return jsonb_build_object(
    'ok', true,
    'lead_id', p_lead_id,
    'next_status', next_status
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

grant execute on function public.apply_needs_action_fast(uuid, text, text, text) to authenticated;

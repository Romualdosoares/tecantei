-- Limites transacionais de créditos em janela móvel de 24 horas.
-- Somente o servidor (service_role) informa os limites; o navegador não pode
-- chamar as reservas antigas nem escolher valores de orçamento.

alter table public.generation_tasks
  add column budget_owner_id uuid references auth.users(id) on delete set null,
  add column budget_scope text not null default 'legacy'
    check (budget_scope ~ '^[a-z][a-z0-9_-]{1,31}$'),
  add column reserved_credits_millis bigint not null default 0
    check (reserved_credits_millis >= 0),
  add column budget_status text not null default 'released'
    check (budget_status in ('reserved','committed','released'));

create index generation_tasks_environment_budget_idx
on public.generation_tasks(budget_scope, created_at)
where budget_status in ('reserved','committed');

create index generation_tasks_owner_budget_idx
on public.generation_tasks(budget_owner_id, budget_scope, created_at)
where budget_status in ('reserved','committed');

revoke all on function public.reserve_original_generation(uuid, text)
from public, anon, authenticated;
revoke all on function public.reserve_adjustment_generation(uuid, uuid, text, text)
from public, anon, authenticated;

create or replace function public.reserve_budgeted_original_generation(
  target_order_id uuid,
  target_owner_id uuid,
  requested_model text,
  requested_credits_millis bigint,
  requested_budget_scope text,
  account_24h_limit_millis bigint,
  environment_24h_limit_millis bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  approved_id uuid;
  logical_key text;
  account_used bigint;
  environment_used bigint;
  task_record public.generation_tasks%rowtype;
begin
  if target_owner_id is null then
    raise exception 'authentication_required';
  end if;
  if requested_model not in ('V3_5','V4','V4_5','V4_5PLUS','V4_5ALL','V5','V5_5','V6','V6_MINI','V6_WILD') then
    raise exception 'invalid_model';
  end if;
  if requested_budget_scope !~ '^[a-z][a-z0-9_-]{1,31}$' then
    raise exception 'invalid_budget_scope';
  end if;
  if requested_credits_millis < 0 or requested_credits_millis > 1000000000 then
    raise exception 'invalid_credit_reservation';
  end if;
  if requested_credits_millis > 0 and (
    account_24h_limit_millis <= 0 or
    environment_24h_limit_millis < account_24h_limit_millis
  ) then
    raise exception 'invalid_generation_budget';
  end if;

  perform 1 from public.orders
  where id = target_order_id
    and owner_id = target_owner_id
    and status in ('lyrics_approved', 'generating')
  for update;
  if not found then
    raise exception 'order_not_generatable';
  end if;

  select id into approved_id
  from public.lyrics
  where order_id = target_order_id and kind = 'approved'
  order by revision desc
  limit 1;
  if approved_id is null then
    raise exception 'approved_lyrics_required';
  end if;

  logical_key := 'original:' || target_order_id::text || ':' || approved_id::text;
  select * into task_record
  from public.generation_tasks
  where request_key = logical_key;

  if task_record.id is null then
    if requested_credits_millis > 0 then
      perform pg_advisory_xact_lock(hashtextextended('generation-budget-env:' || requested_budget_scope, 0));
      perform pg_advisory_xact_lock(hashtextextended('generation-budget-owner:' || requested_budget_scope || ':' || target_owner_id::text, 0));

      select coalesce(sum(reserved_credits_millis), 0) into environment_used
      from public.generation_tasks
      where budget_scope = requested_budget_scope
        and budget_status in ('reserved','committed')
        and created_at >= now() - interval '24 hours';

      if environment_used + requested_credits_millis > environment_24h_limit_millis then
        raise exception 'environment_generation_budget_exceeded';
      end if;

      select coalesce(sum(reserved_credits_millis), 0) into account_used
      from public.generation_tasks
      where budget_owner_id = target_owner_id
        and budget_scope = requested_budget_scope
        and budget_status in ('reserved','committed')
        and created_at >= now() - interval '24 hours';

      if account_used + requested_credits_millis > account_24h_limit_millis then
        raise exception 'account_generation_budget_exceeded';
      end if;
    end if;

    insert into public.generation_tasks(
      order_id, approved_lyric_id, request_key, provider, model, status,
      budget_owner_id, budget_scope, reserved_credits_millis, budget_status
    )
    values (
      target_order_id, approved_id, logical_key, 'kie.ai', requested_model, 'created',
      target_owner_id, requested_budget_scope, requested_credits_millis,
      case when requested_credits_millis = 0 then 'released' else 'reserved' end
    )
    returning * into task_record;

    update public.orders
    set status = 'generating', updated_at = now()
    where id = target_order_id;
  end if;

  return jsonb_build_object(
    'task_id', task_record.id,
    'status', task_record.status,
    'external_task_id', task_record.external_task_id,
    'model', task_record.model,
    'created', task_record.status = 'created' and task_record.submission_claimed_at is null
  );
end;
$$;

revoke all on function public.reserve_budgeted_original_generation(uuid, uuid, text, bigint, text, bigint, bigint) from public, anon, authenticated;
grant execute on function public.reserve_budgeted_original_generation(uuid, uuid, text, bigint, text, bigint, bigint) to service_role;

create or replace function public.reserve_budgeted_adjustment_generation(
  target_order_id uuid,
  target_owner_id uuid,
  target_source_version_id uuid,
  notes text,
  requested_model text,
  requested_credits_millis bigint,
  requested_budget_scope text,
  account_24h_limit_millis bigint,
  environment_24h_limit_millis bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  approved_id uuid;
  account_used bigint;
  environment_used bigint;
  adjustment_record public.adjustment_requests%rowtype;
  task_record public.generation_tasks%rowtype;
begin
  if target_owner_id is null then
    raise exception 'authentication_required';
  end if;
  if length(trim(notes)) < 3 or length(notes) > 2000 then
    raise exception 'invalid_adjustment_notes';
  end if;
  if requested_model not in ('V3_5','V4','V4_5','V4_5PLUS','V4_5ALL','V5','V5_5','V6','V6_MINI','V6_WILD') then
    raise exception 'invalid_model';
  end if;
  if requested_budget_scope !~ '^[a-z][a-z0-9_-]{1,31}$' then
    raise exception 'invalid_budget_scope';
  end if;
  if requested_credits_millis < 0 or requested_credits_millis > 1000000000 then
    raise exception 'invalid_credit_reservation';
  end if;
  if requested_credits_millis > 0 and (
    account_24h_limit_millis <= 0 or
    environment_24h_limit_millis < account_24h_limit_millis
  ) then
    raise exception 'invalid_generation_budget';
  end if;

  perform 1 from public.orders
  where id = target_order_id
    and owner_id = target_owner_id
    and status = 'preview_ready'
  for update;
  if not found then
    raise exception 'order_not_adjustable';
  end if;

  select * into adjustment_record
  from public.adjustment_requests
  where order_id = target_order_id;
  if adjustment_record.id is not null and adjustment_record.status <> 'technical_failure' then
    select * into task_record
    from public.generation_tasks
    where id = adjustment_record.generation_task_id;
    return jsonb_build_object(
      'adjustment_id', adjustment_record.id,
      'task_id', task_record.id,
      'status', task_record.status,
      'created', false
    );
  end if;

  perform 1 from public.orders
  where id = target_order_id and adjustment_status = 'available';
  if not found then
    raise exception 'adjustment_unavailable';
  end if;

  select approved_lyric_id into approved_id
  from public.music_versions
  where id = target_source_version_id
    and order_id = target_order_id
    and status = 'ready';
  if approved_id is null then
    raise exception 'source_version_unavailable';
  end if;

  if requested_credits_millis > 0 then
    perform pg_advisory_xact_lock(hashtextextended('generation-budget-env:' || requested_budget_scope, 0));
    perform pg_advisory_xact_lock(hashtextextended('generation-budget-owner:' || requested_budget_scope || ':' || target_owner_id::text, 0));

    select coalesce(sum(reserved_credits_millis), 0) into environment_used
    from public.generation_tasks
    where budget_scope = requested_budget_scope
      and budget_status in ('reserved','committed')
      and created_at >= now() - interval '24 hours';
    if environment_used + requested_credits_millis > environment_24h_limit_millis then
      raise exception 'environment_generation_budget_exceeded';
    end if;

    select coalesce(sum(reserved_credits_millis), 0) into account_used
    from public.generation_tasks
    where budget_owner_id = target_owner_id
      and budget_scope = requested_budget_scope
      and budget_status in ('reserved','committed')
      and created_at >= now() - interval '24 hours';
    if account_used + requested_credits_millis > account_24h_limit_millis then
      raise exception 'account_generation_budget_exceeded';
    end if;
  end if;

  insert into public.generation_tasks(
    order_id, approved_lyric_id, request_key, provider, model, status,
    budget_owner_id, budget_scope, reserved_credits_millis, budget_status
  )
  values (
    target_order_id,
    approved_id,
    'adjustment:' || target_order_id::text || ':' || (coalesce(adjustment_record.generation_attempts, 0) + 1)::text,
    'kie.ai', requested_model, 'created', target_owner_id, requested_budget_scope,
    requested_credits_millis,
    case when requested_credits_millis = 0 then 'released' else 'reserved' end
  )
  returning * into task_record;

  if adjustment_record.id is null then
    insert into public.adjustment_requests(
      order_id, source_version_id, generation_task_id, generation_attempts, status, customer_notes
    ) values (
      target_order_id, target_source_version_id, task_record.id, 1, 'reserved', trim(notes)
    ) returning * into adjustment_record;
  else
    update public.adjustment_requests
    set source_version_id = target_source_version_id,
        generation_task_id = task_record.id,
        generation_attempts = generation_attempts + 1,
        status = 'reserved',
        customer_notes = trim(notes),
        updated_at = now()
    where id = adjustment_record.id
    returning * into adjustment_record;
  end if;

  update public.orders
  set adjustment_status = 'reserved', updated_at = now()
  where id = target_order_id;

  return jsonb_build_object(
    'adjustment_id', adjustment_record.id,
    'task_id', task_record.id,
    'status', task_record.status,
    'created', true
  );
end;
$$;

revoke all on function public.reserve_budgeted_adjustment_generation(uuid, uuid, uuid, text, text, bigint, text, bigint, bigint) from public, anon, authenticated;
grant execute on function public.reserve_budgeted_adjustment_generation(uuid, uuid, uuid, text, text, bigint, text, bigint, bigint) to service_role;

create or replace function public.record_generation_submission(
  target_task_id uuid,
  provider_task_id text,
  estimated_credits_millis bigint default 0
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_order_id uuid;
  reserved_amount bigint;
begin
  if length(trim(provider_task_id)) < 3 or length(provider_task_id) > 200 then
    raise exception 'invalid_provider_task_id';
  end if;

  select reserved_credits_millis into reserved_amount
  from public.generation_tasks
  where id = target_task_id and status = 'reconciling'
  for update;
  if reserved_amount is null then
    return false;
  end if;
  if reserved_amount <> estimated_credits_millis then
    raise exception 'reserved_credits_mismatch';
  end if;

  update public.generation_tasks
  set external_task_id = provider_task_id,
      status = 'submitted',
      accepted_at = coalesce(accepted_at, now()),
      error_code = null,
      budget_status = case when reserved_credits_millis = 0 then 'released' else 'committed' end,
      updated_at = now()
  where id = target_task_id and status = 'reconciling'
  returning order_id into affected_order_id;

  if estimated_credits_millis > 0 then
    insert into public.cost_events(
      order_id, generation_task_id, provider, operation, credits_millis, status
    ) values (
      affected_order_id, target_task_id, 'kie.ai', 'generate_music', estimated_credits_millis, 'estimated'
    )
    on conflict (generation_task_id, operation)
      where generation_task_id is not null
    do nothing;
  end if;

  update public.adjustment_requests
  set status = 'processing', updated_at = now()
  where generation_task_id = target_task_id and status in ('reserved', 'reconciling');
  return true;
end;
$$;

revoke all on function public.record_generation_submission(uuid, text, bigint) from public, anon, authenticated;
grant execute on function public.record_generation_submission(uuid, text, bigint) to service_role;

create or replace function public.record_generation_submission_failure(
  target_task_id uuid,
  failure_code text,
  acceptance_unknown boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_order_id uuid;
begin
  update public.generation_tasks
  set status = case when acceptance_unknown then 'reconciling' else 'failed' end,
      error_code = left(coalesce(nullif(failure_code, ''), 'submission_failed'), 80),
      completed_at = case when acceptance_unknown then null else now() end,
      budget_status = case when acceptance_unknown then budget_status else 'released' end,
      updated_at = now()
  where id = target_task_id and status = 'reconciling'
  returning order_id into affected_order_id;
  if affected_order_id is null then
    return false;
  end if;

  update public.adjustment_requests
  set status = case when acceptance_unknown then 'reconciling' else 'technical_failure' end,
      updated_at = now()
  where generation_task_id = target_task_id;

  if not acceptance_unknown then
    update public.orders
    set adjustment_status = 'available', updated_at = now()
    where id = affected_order_id
      and exists (
        select 1 from public.adjustment_requests
        where generation_task_id = target_task_id
      );
  end if;
  return true;
end;
$$;

revoke all on function public.record_generation_submission_failure(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.record_generation_submission_failure(uuid, text, boolean) to service_role;

-- Reserva e submissão idempotentes da primeira geração musical.
-- A chamada externa é reivindicada uma única vez pelo servidor. Se o processo
-- cair depois dessa reivindicação, a tarefa fica em conciliação e nunca é
-- reenviada automaticamente.

alter table public.generation_tasks
  add column submission_claimed_at timestamptz;

alter table public.adjustment_requests
  add column generation_task_id uuid unique references public.generation_tasks(id);
alter table public.adjustment_requests
  add column generation_attempts integer not null default 0 check (generation_attempts >= 0);

create unique index cost_events_task_operation_unique
on public.cost_events(generation_task_id, operation)
where generation_task_id is not null;

create or replace function public.reserve_original_generation(
  target_order_id uuid,
  requested_model text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  approved_id uuid;
  logical_key text;
  task_record public.generation_tasks%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if requested_model not in ('V3_5','V4','V4_5','V4_5PLUS','V4_5ALL','V5','V5_5') then
    raise exception 'invalid_model';
  end if;

  perform 1 from public.orders
  where id = target_order_id
    and owner_id = auth.uid()
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
    insert into public.generation_tasks(
      order_id,
      approved_lyric_id,
      request_key,
      provider,
      model,
      status
    )
    values (
      target_order_id,
      approved_id,
      logical_key,
      'kie.ai',
      requested_model,
      'created'
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

revoke all on function public.reserve_original_generation(uuid, text) from public;
grant execute on function public.reserve_original_generation(uuid, text) to authenticated;

create or replace function public.reserve_adjustment_generation(
  target_order_id uuid,
  target_source_version_id uuid,
  notes text,
  requested_model text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  approved_id uuid;
  adjustment_record public.adjustment_requests%rowtype;
  task_record public.generation_tasks%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if length(trim(notes)) < 3 or length(notes) > 2000 then
    raise exception 'invalid_adjustment_notes';
  end if;
  if requested_model not in ('V3_5','V4','V4_5','V4_5PLUS','V4_5ALL','V5','V5_5') then
    raise exception 'invalid_model';
  end if;

  perform 1 from public.orders
  where id = target_order_id
    and owner_id = auth.uid()
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

  insert into public.generation_tasks(
    order_id,
    approved_lyric_id,
    request_key,
    provider,
    model,
    status
  )
  values (
    target_order_id,
    approved_id,
    'adjustment:' || target_order_id::text || ':' ||
      (coalesce(adjustment_record.generation_attempts, 0) + 1)::text,
    'kie.ai',
    requested_model,
    'created'
  )
  returning * into task_record;

  if adjustment_record.id is null then
    insert into public.adjustment_requests(
      order_id,
      source_version_id,
      generation_task_id,
      generation_attempts,
      status,
      customer_notes
    )
    values (
      target_order_id,
      target_source_version_id,
      task_record.id,
      1,
      'reserved',
      trim(notes)
    )
    returning * into adjustment_record;
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

revoke all on function public.reserve_adjustment_generation(uuid, uuid, text, text) from public;
grant execute on function public.reserve_adjustment_generation(uuid, uuid, text, text) to authenticated;

create or replace function public.claim_generation_submission(target_task_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.generation_tasks
  set status = 'reconciling',
      submission_claimed_at = now(),
      updated_at = now()
  where id = target_task_id and status = 'created';
  return found;
end;
$$;

revoke all on function public.claim_generation_submission(uuid) from public;
grant execute on function public.claim_generation_submission(uuid) to service_role;

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
begin
  if length(trim(provider_task_id)) < 3 or length(provider_task_id) > 200 then
    raise exception 'invalid_provider_task_id';
  end if;

  update public.generation_tasks
  set external_task_id = provider_task_id,
      status = 'submitted',
      accepted_at = coalesce(accepted_at, now()),
      error_code = null,
      updated_at = now()
  where id = target_task_id and status = 'reconciling'
  returning order_id into affected_order_id;
  if affected_order_id is null then
    return false;
  end if;

  if estimated_credits_millis > 0 then
    insert into public.cost_events(
      order_id,
      generation_task_id,
      provider,
      operation,
      credits_millis,
      status
    )
    values (
      affected_order_id,
      target_task_id,
      'kie.ai',
      'generate_music',
      estimated_credits_millis,
      'estimated'
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

revoke all on function public.record_generation_submission(uuid, text, bigint) from public;
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

revoke all on function public.record_generation_submission_failure(uuid, text, boolean) from public;
grant execute on function public.record_generation_submission_failure(uuid, text, boolean) to service_role;

create or replace function public.apply_generation_callback(
  provider_task_id text,
  callback_type text,
  response_code integer,
  callback_error_code text,
  callback_tracks jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  task_record public.generation_tasks%rowtype;
  track jsonb;
  track_id text;
  track_url text;
  version_id uuid;
  output_count integer;
  next_status text;
  track_origin text;
  adjustment_id uuid;
begin
  if callback_type not in ('text', 'first', 'complete', 'error') then
    raise exception 'invalid_callback_type';
  end if;
  if jsonb_typeof(coalesce(callback_tracks, '[]'::jsonb)) <> 'array' then
    raise exception 'invalid_callback_tracks';
  end if;

  select * into task_record
  from public.generation_tasks
  where provider = 'kie.ai' and external_task_id = provider_task_id
  for update;
  if task_record.id is null then
    return jsonb_build_object('found', false);
  end if;

  select id into adjustment_id
  from public.adjustment_requests
  where generation_task_id = task_record.id;
  track_origin := case when adjustment_id is null then 'original' else 'adjustment' end;

  if task_record.status in ('succeeded', 'failed') then
    return jsonb_build_object(
      'found', true,
      'status', task_record.status,
      'terminal', true
    );
  end if;

  if response_code <> 200 or callback_type = 'error' then
    update public.generation_tasks
    set status = 'failed',
        error_code = left(
          coalesce(nullif(callback_error_code, ''), 'provider_callback_error'),
          80
        ),
        completed_at = coalesce(completed_at, now()),
        updated_at = now()
    where id = task_record.id;

    update public.cost_events
    set status = case when response_code = 531 then 'refunded' else 'reconciling' end
    where generation_task_id = task_record.id
      and operation = 'generate_music'
      and status = 'estimated';

    if adjustment_id is not null then
      update public.adjustment_requests
      set status = 'technical_failure', updated_at = now()
      where id = adjustment_id;
      update public.orders
      set adjustment_status = 'available', updated_at = now()
      where id = task_record.order_id;
    end if;

    return jsonb_build_object('found', true, 'status', 'failed', 'terminal', true);
  end if;

  for track in select value from jsonb_array_elements(coalesce(callback_tracks, '[]'::jsonb))
  loop
    track_id := nullif(trim(track ->> 'id'), '');
    track_url := nullif(trim(track ->> 'audio_url'), '');
    if track_id is null
       or length(track_id) > 200
       or track_url is null
       or length(track_url) > 2048
       or left(track_url, 8) <> 'https://' then
      raise exception 'invalid_callback_track';
    end if;

    insert into public.music_versions(
      order_id,
      approved_lyric_id,
      origin,
      status,
      title,
      duration_seconds,
      provider_audio_id
    )
    values (
      task_record.order_id,
      task_record.approved_lyric_id,
      track_origin,
      'generating',
      left(coalesce(nullif(track ->> 'title', ''), 'Sem título'), 200),
      round((track ->> 'duration')::numeric)::integer,
      track_id
    )
    on conflict (provider_audio_id) do nothing;

    select id into version_id
    from public.music_versions
    where provider_audio_id = track_id
      and order_id = task_record.order_id
      and approved_lyric_id = task_record.approved_lyric_id;
    if version_id is null then
      raise exception 'provider_audio_conflict';
    end if;

    insert into public.generation_outputs(
      generation_task_id,
      version_id,
      provider_audio_id,
      source_audio_url,
      storage_status
    )
    values (
      task_record.id,
      version_id,
      track_id,
      track_url,
      'pending'
    )
    on conflict (generation_task_id, provider_audio_id) do update
    set source_audio_url = case
          when public.generation_outputs.storage_status = 'stored'
            then public.generation_outputs.source_audio_url
          else excluded.source_audio_url
        end,
        updated_at = now();
  end loop;

  select count(*) into output_count
  from public.generation_outputs
  where generation_task_id = task_record.id;

  next_status := case
    when callback_type = 'complete' and output_count > 0 then 'succeeded'
    when callback_type = 'complete' then 'reconciling'
    else 'processing'
  end;

  update public.generation_tasks
  set status = next_status,
      error_code = case
        when next_status = 'reconciling' then 'complete_without_tracks'
        else null
      end,
      completed_at = case when next_status = 'succeeded' then coalesce(completed_at, now()) else null end,
      updated_at = now()
  where id = task_record.id;

  if adjustment_id is not null and next_status in ('processing', 'succeeded') then
    update public.adjustment_requests
    set status = 'processing', updated_at = now()
    where id = adjustment_id and status in ('reserved', 'reconciling', 'processing');
  end if;

  if next_status = 'succeeded' then
    update public.cost_events
    set status = 'confirmed'
    where generation_task_id = task_record.id
      and operation = 'generate_music'
      and status in ('estimated', 'reconciling');
  end if;

  return jsonb_build_object(
    'found', true,
    'status', next_status,
    'terminal', next_status = 'succeeded',
    'output_count', output_count
  );
end;
$$;

revoke all on function public.apply_generation_callback(text, text, integer, text, jsonb) from public;
grant execute on function public.apply_generation_callback(text, text, integer, text, jsonb) to service_role;

alter table public.generation_outputs
  add column storage_claimed_at timestamptz;

alter table public.generation_outputs
  drop constraint if exists generation_outputs_storage_status_check;
alter table public.generation_outputs
  add constraint generation_outputs_storage_status_check
  check (storage_status in ('pending', 'processing', 'stored', 'failed'));

create or replace function public.claim_generation_output(max_attempts integer default 3)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed record;
begin
  if max_attempts < 1 or max_attempts > 10 then
    raise exception 'invalid_max_attempts';
  end if;

  select
    output.id as output_id,
    output.version_id,
    version.order_id,
    output.provider_audio_id,
    output.source_audio_url
  into claimed
  from public.generation_outputs output
  join public.music_versions version on version.id = output.version_id
  where output.storage_attempts < max_attempts
    and (
      output.storage_status in ('pending', 'failed')
      or (
        output.storage_status = 'processing'
        and output.storage_claimed_at < now() - interval '10 minutes'
      )
    )
  order by output.updated_at, output.id
  for update of output skip locked
  limit 1;

  if claimed.output_id is null then
    return null;
  end if;

  update public.generation_outputs
  set storage_status = 'processing',
      storage_attempts = storage_attempts + 1,
      storage_claimed_at = now(),
      last_error_code = null,
      updated_at = now()
  where id = claimed.output_id;

  return jsonb_build_object(
    'output_id', claimed.output_id,
    'version_id', claimed.version_id,
    'order_id', claimed.order_id,
    'provider_audio_id', claimed.provider_audio_id,
    'source_audio_url', claimed.source_audio_url
  );
end;
$$;

revoke all on function public.claim_generation_output(integer) from public;
grant execute on function public.claim_generation_output(integer) to service_role;

create or replace function public.record_generation_output_failure(
  target_output_id uuid,
  failure_code text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  failed_task_id uuid;
  failed_order_id uuid;
begin
  update public.generation_outputs
  set storage_status = 'failed',
      storage_claimed_at = null,
      last_error_code = left(coalesce(nullif(failure_code, ''), 'output_failed'), 80),
      updated_at = now()
  where id = target_output_id and storage_status = 'processing'
  returning generation_task_id into failed_task_id;
  if failed_task_id is null then
    return false;
  end if;

  update public.adjustment_requests
  set status = 'technical_failure', updated_at = now()
  where generation_task_id = failed_task_id
    and not exists (
      select 1 from public.generation_outputs
      where generation_task_id = failed_task_id
        and (
          storage_status in ('pending', 'processing', 'stored')
          or (storage_status = 'failed' and storage_attempts < 3)
        )
    )
  returning order_id into failed_order_id;

  if failed_order_id is not null then
    update public.orders
    set adjustment_status = 'available', updated_at = now()
    where id = failed_order_id;
  end if;

  return true;
end;
$$;

revoke all on function public.record_generation_output_failure(uuid, text) from public;
grant execute on function public.record_generation_output_failure(uuid, text) to service_role;

create or replace function public.publish_generation_output(
  target_output_id uuid,
  full_object_key text,
  preview_object_key text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  output_record record;
  expected_full_key text;
  expected_preview_key text;
begin
  select
    output.id,
    output.version_id,
    output.generation_task_id,
    output.storage_status,
    version.order_id,
    version.origin
  into output_record
  from public.generation_outputs output
  join public.music_versions version on version.id = output.version_id
  where output.id = target_output_id
  for update of output, version;

  if output_record.id is null or output_record.storage_status <> 'processing' then
    return false;
  end if;

  expected_full_key := 'orders/' || output_record.order_id::text ||
    '/versions/' || output_record.version_id::text || '/full.mp3';
  expected_preview_key := 'orders/' || output_record.order_id::text ||
    '/versions/' || output_record.version_id::text || '/preview.mp3';
  if full_object_key <> expected_full_key or preview_object_key <> expected_preview_key then
    raise exception 'unexpected_audio_object_key';
  end if;

  update public.generation_outputs
  set storage_status = 'stored',
      storage_claimed_at = null,
      last_error_code = null,
      source_audio_url = '',
      updated_at = now()
  where id = target_output_id;

  update public.music_versions
  set full_audio_object_key = full_object_key,
      preview_object_key = preview_object_key,
      status = 'ready',
      updated_at = now()
  where id = output_record.version_id;

  update public.orders
  set status = 'preview_ready',
      preview_expires_at = coalesce(preview_expires_at, now() + interval '14 days'),
      adjustment_status = case
        when adjustment_status = 'unavailable' and output_record.origin = 'original'
          then 'available'
        else adjustment_status
      end,
      updated_at = now()
  where id = output_record.order_id and status in ('generating', 'preview_ready');

  if output_record.origin = 'adjustment' then
    update public.adjustment_requests
    set status = 'completed', updated_at = now()
    where generation_task_id = output_record.generation_task_id;
    update public.orders
    set adjustment_status = 'completed', updated_at = now()
    where id = output_record.order_id;
  end if;

  return true;
end;
$$;

revoke all on function public.publish_generation_output(uuid, text, text) from public;
grant execute on function public.publish_generation_output(uuid, text, text) to service_role;

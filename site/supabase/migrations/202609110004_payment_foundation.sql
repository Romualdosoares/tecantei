-- Seleção da versão e pagamento simulado. O navegador apenas prepara o
-- checkout; somente um evento administrativo pode confirmar e liberar o pedido.

alter table public.payment_intents
  add column client_request_id uuid unique;

create or replace function public.prepare_mock_checkout(
  target_order_id uuid,
  target_version_id uuid,
  request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_record public.orders%rowtype;
  payment_record public.payment_intents%rowtype;
  full_object_key text;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select payment.* into payment_record
  from public.payment_intents payment
  join public.orders order_row on order_row.id = payment.order_id
  where payment.client_request_id = request_id
    and order_row.owner_id = auth.uid();
  if payment_record.id is not null then
    if payment_record.order_id <> target_order_id then
      raise exception 'checkout_request_conflict';
    end if;
    return jsonb_build_object(
      'payment_intent_id', payment_record.id,
      'version_id', payment_record.version_id,
      'status', payment_record.status,
      'amount_cents', payment_record.amount_cents,
      'currency', payment_record.currency,
      'created', false
    );
  end if;

  select * into order_record
  from public.orders
  where id = target_order_id and owner_id = auth.uid()
  for update;
  if order_record.id is null
     or order_record.status not in ('preview_ready', 'payment_pending') then
    raise exception 'order_not_payable';
  end if;
  if order_record.preview_expires_at is not null
     and order_record.preview_expires_at <= now() then
    raise exception 'preview_expired';
  end if;
  if order_record.adjustment_status = 'reserved' then
    raise exception 'adjustment_in_progress';
  end if;

  select version.full_audio_object_key into full_object_key
  from public.music_versions version
  where version.id = target_version_id
    and version.order_id = target_order_id
    and version.status = 'ready'
    and version.full_audio_object_key is not null;
  if full_object_key is null then
    raise exception 'version_not_payable';
  end if;

  update public.payment_intents
  set status = 'cancelled', updated_at = now()
  where order_id = target_order_id
    and status in ('created', 'pending')
    and version_id <> target_version_id;

  insert into public.order_selections(order_id, version_id, selected_at)
  values (target_order_id, target_version_id, now())
  on conflict (order_id) do update
  set version_id = excluded.version_id,
      selected_at = excluded.selected_at;

  select * into payment_record
  from public.payment_intents
  where order_id = target_order_id
    and version_id = target_version_id
    and status in ('created', 'pending')
  order by created_at desc
  limit 1;
  if payment_record.id is not null then
    update public.orders
    set status = 'payment_pending', updated_at = now()
    where id = target_order_id;
    return jsonb_build_object(
      'payment_intent_id', payment_record.id,
      'version_id', payment_record.version_id,
      'status', payment_record.status,
      'amount_cents', payment_record.amount_cents,
      'currency', payment_record.currency,
      'created', false
    );
  end if;

  insert into public.payment_intents(
    order_id,
    version_id,
    provider,
    external_payment_id,
    client_request_id,
    amount_cents,
    currency,
    status
  )
  values (
    target_order_id,
    target_version_id,
    'mock',
    null,
    request_id,
    1990,
    'BRL',
    'pending'
  )
  returning * into payment_record;

  update public.payment_intents
  set external_payment_id = 'mock-' || payment_record.id::text
  where id = payment_record.id
  returning * into payment_record;

  update public.orders
  set status = 'payment_pending', updated_at = now()
  where id = target_order_id;

  return jsonb_build_object(
    'payment_intent_id', payment_record.id,
    'version_id', payment_record.version_id,
    'status', payment_record.status,
    'amount_cents', payment_record.amount_cents,
    'currency', payment_record.currency,
    'created', true
  );
end;
$$;

revoke all on function public.prepare_mock_checkout(uuid, uuid, uuid) from public;
grant execute on function public.prepare_mock_checkout(uuid, uuid, uuid) to authenticated;

create or replace function public.apply_mock_payment_event(
  target_payment_intent_id uuid,
  provider_event_id text,
  incoming_status text,
  event_payload_hash text,
  delivery_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_record public.payment_intents%rowtype;
  existing_event public.payment_events%rowtype;
  inserted_event_id uuid;
  selected_version_id uuid;
  full_object_key text;
  delivery_record public.deliveries%rowtype;
  next_status text;
begin
  if length(trim(provider_event_id)) < 3 or length(provider_event_id) > 200 then
    raise exception 'invalid_event_id';
  end if;
  if incoming_status not in ('pending', 'confirmed', 'failed') then
    raise exception 'invalid_payment_status';
  end if;
  if event_payload_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_payload_hash';
  end if;

  select * into payment_record
  from public.payment_intents
  where id = target_payment_intent_id and provider = 'mock'
  for update;
  if payment_record.id is null then
    return jsonb_build_object('found', false);
  end if;

  insert into public.payment_events(
    payment_intent_id,
    provider,
    external_event_id,
    event_type,
    payload_hash,
    occurred_at,
    processed_at
  )
  values (
    payment_record.id,
    'mock',
    provider_event_id,
    'payment.' || incoming_status,
    event_payload_hash,
    now(),
    now()
  )
  on conflict (provider, external_event_id) do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then
    select * into existing_event
    from public.payment_events
    where provider = 'mock' and external_event_id = provider_event_id;
    if existing_event.payment_intent_id <> payment_record.id
       or existing_event.payload_hash <> event_payload_hash then
      raise exception 'payment_event_conflict';
    end if;
    return jsonb_build_object(
      'found', true,
      'duplicate', true,
      'status', payment_record.status
    );
  end if;

  next_status := case
    when payment_record.status = 'confirmed' then 'confirmed'
    when payment_record.status in ('failed', 'cancelled', 'refunded') then payment_record.status
    when incoming_status = 'confirmed' then 'confirmed'
    when incoming_status = 'failed' then 'failed'
    else 'pending'
  end;

  if next_status = 'confirmed' then
    if delivery_token_hash !~ '^[a-f0-9]{64}$' then
      raise exception 'invalid_delivery_token_hash';
    end if;
    select selection.version_id into selected_version_id
    from public.order_selections selection
    where selection.order_id = payment_record.order_id;
    if selected_version_id is null or selected_version_id <> payment_record.version_id then
      raise exception 'payment_selection_mismatch';
    end if;

    select version.full_audio_object_key into full_object_key
    from public.music_versions version
    where version.id = selected_version_id
      and version.order_id = payment_record.order_id
      and version.status = 'ready';
    if full_object_key is null then
      raise exception 'paid_audio_unavailable';
    end if;

    insert into public.deliveries(
      order_id,
      version_id,
      full_audio_object_key,
      share_token_hash
    )
    values (
      payment_record.order_id,
      selected_version_id,
      full_object_key,
      delivery_token_hash
    )
    on conflict (order_id) do nothing;

    select * into delivery_record
    from public.deliveries
    where order_id = payment_record.order_id;
    if delivery_record.version_id <> selected_version_id
       or delivery_record.full_audio_object_key <> full_object_key then
      raise exception 'delivery_version_mismatch';
    end if;

    update public.orders
    set status = 'paid', updated_at = now()
    where id = payment_record.order_id and status = 'payment_pending';
  elsif next_status = 'failed' then
    update public.orders
    set status = 'preview_ready', updated_at = now()
    where id = payment_record.order_id and status = 'payment_pending';
  end if;

  update public.payment_intents
  set status = next_status, updated_at = now()
  where id = payment_record.id
  returning * into payment_record;

  return jsonb_build_object(
    'found', true,
    'duplicate', false,
    'status', payment_record.status,
    'order_id', payment_record.order_id,
    'version_id', payment_record.version_id
  );
end;
$$;

revoke all on function public.apply_mock_payment_event(uuid, text, text, text, text) from public;
grant execute on function public.apply_mock_payment_event(uuid, text, text, text, text) to service_role;

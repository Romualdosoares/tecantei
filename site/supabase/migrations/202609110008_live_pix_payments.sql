-- Fluxo persistente para cobranças Pix reais. A intenção é reservada antes da
-- chamada externa; somente o service_role associa a resposta e aplica eventos.

alter table public.payment_intents
  add column expires_at timestamptz;

create or replace function public.prepare_provider_checkout(
  target_order_id uuid,
  target_version_id uuid,
  request_id uuid,
  selected_provider text
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
  if selected_provider not in ('efi', 'mercado_pago') then
    raise exception 'invalid_payment_provider';
  end if;

  select payment.* into payment_record
  from public.payment_intents payment
  join public.orders order_row on order_row.id = payment.order_id
  where payment.client_request_id = request_id
    and order_row.owner_id = auth.uid();
  if payment_record.id is not null then
    if payment_record.order_id <> target_order_id
       or payment_record.version_id <> target_version_id
       or payment_record.provider <> selected_provider then
      raise exception 'checkout_request_conflict';
    end if;
    if payment_record.status in ('failed', 'cancelled', 'refunded') then
      raise exception 'checkout_inactive';
    end if;
    if payment_record.status in ('created', 'pending')
       and payment_record.expires_at is not null
       and payment_record.expires_at <= now() then
      raise exception 'checkout_expired';
    end if;
    return jsonb_build_object(
      'payment_intent_id', payment_record.id,
      'version_id', payment_record.version_id,
      'provider', payment_record.provider,
      'external_payment_id', payment_record.external_payment_id,
      'client_request_id', payment_record.client_request_id,
      'status', payment_record.status,
      'amount_cents', payment_record.amount_cents,
      'currency', payment_record.currency,
      'expires_at', payment_record.expires_at,
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
    and (version_id <> target_version_id or provider <> selected_provider);

  insert into public.order_selections(order_id, version_id, selected_at)
  values (target_order_id, target_version_id, now())
  on conflict (order_id) do update
  set version_id = excluded.version_id,
      selected_at = excluded.selected_at;

  update public.payment_intents
  set status = 'cancelled', updated_at = now()
  where order_id = target_order_id
    and status in ('created', 'pending')
    and expires_at is not null
    and expires_at <= now();

  select * into payment_record
  from public.payment_intents
  where order_id = target_order_id
    and version_id = target_version_id
    and provider = selected_provider
    and status in ('created', 'pending')
    and (expires_at is null or expires_at > now())
  order by created_at desc
  limit 1;
  if payment_record.id is null then
    insert into public.payment_intents(
      order_id,
      version_id,
      provider,
      client_request_id,
      amount_cents,
      currency,
      status
    ) values (
      target_order_id,
      target_version_id,
      selected_provider,
      request_id,
      1990,
      'BRL',
      'created'
    ) returning * into payment_record;
  end if;

  update public.orders
  set status = 'payment_pending', updated_at = now()
  where id = target_order_id;

  return jsonb_build_object(
    'payment_intent_id', payment_record.id,
    'version_id', payment_record.version_id,
    'provider', payment_record.provider,
    'external_payment_id', payment_record.external_payment_id,
    'client_request_id', payment_record.client_request_id,
    'status', payment_record.status,
    'amount_cents', payment_record.amount_cents,
    'currency', payment_record.currency,
    'expires_at', payment_record.expires_at,
    'created', payment_record.client_request_id = request_id
  );
end;
$$;

revoke all on function public.prepare_provider_checkout(uuid, uuid, uuid, text) from public;
grant execute on function public.prepare_provider_checkout(uuid, uuid, uuid, text) to authenticated;

create or replace function public.attach_provider_payment(
  target_payment_intent_id uuid,
  selected_provider text,
  target_external_payment_id text,
  provider_amount_cents integer,
  provider_currency text,
  target_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_record public.payment_intents%rowtype;
begin
  if selected_provider not in ('efi', 'mercado_pago') then
    raise exception 'invalid_payment_provider';
  end if;
  if length(trim(target_external_payment_id)) < 1
     or length(target_external_payment_id) > 200 then
    raise exception 'invalid_external_payment_id';
  end if;

  select * into payment_record
  from public.payment_intents
  where id = target_payment_intent_id and provider = selected_provider
  for update;
  if payment_record.id is null then
    return jsonb_build_object('found', false);
  end if;
  if payment_record.status not in ('created', 'pending') then
    raise exception 'payment_not_attachable';
  end if;
  if payment_record.amount_cents <> provider_amount_cents
     or payment_record.currency <> provider_currency then
    raise exception 'payment_amount_mismatch';
  end if;
  if payment_record.external_payment_id is not null
     and payment_record.external_payment_id <> target_external_payment_id then
    raise exception 'external_payment_conflict';
  end if;

  update public.payment_intents
  set external_payment_id = target_external_payment_id,
      status = 'pending',
      expires_at = target_expires_at,
      updated_at = now()
  where id = payment_record.id
  returning * into payment_record;

  return jsonb_build_object(
    'found', true,
    'payment_intent_id', payment_record.id,
    'status', payment_record.status,
    'external_payment_id', payment_record.external_payment_id
  );
end;
$$;

revoke all on function public.attach_provider_payment(uuid, text, text, integer, text, timestamptz) from public;
grant execute on function public.attach_provider_payment(uuid, text, text, integer, text, timestamptz) to service_role;

create or replace function public.apply_provider_payment_event(
  selected_provider text,
  target_external_payment_id text,
  provider_event_id text,
  incoming_status text,
  provider_amount_cents integer,
  provider_currency text,
  event_payload_hash text,
  event_occurred_at timestamptz,
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
  if selected_provider not in ('efi', 'mercado_pago') then
    raise exception 'invalid_payment_provider';
  end if;
  if length(trim(provider_event_id)) < 3 or length(provider_event_id) > 200 then
    raise exception 'invalid_event_id';
  end if;
  if incoming_status not in ('pending', 'confirmed', 'failed', 'refunded') then
    raise exception 'invalid_payment_status';
  end if;
  if event_payload_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_payload_hash';
  end if;

  select * into payment_record
  from public.payment_intents
  where provider = selected_provider
    and external_payment_id = target_external_payment_id
  for update;
  if payment_record.id is null then
    return jsonb_build_object('found', false);
  end if;
  if payment_record.amount_cents <> provider_amount_cents
     or payment_record.currency <> provider_currency then
    raise exception 'payment_amount_mismatch';
  end if;

  insert into public.payment_events(
    payment_intent_id,
    provider,
    external_event_id,
    event_type,
    payload_hash,
    occurred_at,
    processed_at
  ) values (
    payment_record.id,
    selected_provider,
    provider_event_id,
    'payment.' || incoming_status,
    event_payload_hash,
    coalesce(event_occurred_at, now()),
    now()
  )
  on conflict (provider, external_event_id) do nothing
  returning id into inserted_event_id;

  if inserted_event_id is null then
    select * into existing_event
    from public.payment_events
    where provider = selected_provider and external_event_id = provider_event_id;
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
    when payment_record.status = 'refunded' then 'refunded'
    when payment_record.status = 'confirmed' and incoming_status = 'refunded' then 'refunded'
    when payment_record.status = 'confirmed' then 'confirmed'
    when payment_record.status in ('failed', 'cancelled') then payment_record.status
    when incoming_status = 'confirmed' then 'confirmed'
    when incoming_status = 'failed' then 'failed'
    when incoming_status = 'refunded' then 'refunded'
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
    ) values (
      payment_record.order_id,
      selected_version_id,
      full_object_key,
      delivery_token_hash
    ) on conflict (order_id) do nothing;

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

revoke all on function public.apply_provider_payment_event(text, text, text, text, integer, text, text, timestamptz, text) from public;
grant execute on function public.apply_provider_payment_event(text, text, text, text, integer, text, text, timestamptz, text) to service_role;

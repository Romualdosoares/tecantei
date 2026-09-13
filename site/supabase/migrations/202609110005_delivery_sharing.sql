-- Entrega privada do comprador e link público revogável. O token bruto nunca é
-- salvo; somente seu SHA-256 fica no banco.

alter table public.deliveries
  add column dedication text,
  add column share_enabled_at timestamptz,
  add column first_accessed_at timestamptz;

create or replace function public.rotate_delivery_share(
  target_order_id uuid,
  target_token_hash text,
  target_dedication text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery_record public.deliveries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if target_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid_share_token_hash';
  end if;
  if length(trim(target_dedication)) < 1 or length(target_dedication) > 500 then
    raise exception 'invalid_dedication';
  end if;

  perform 1 from public.orders
  where id = target_order_id
    and owner_id = auth.uid()
    and status in ('paid', 'delivered')
  for update;
  if not found then
    raise exception 'delivery_not_shareable';
  end if;

  update public.deliveries
  set share_token_hash = target_token_hash,
      dedication = trim(target_dedication),
      share_enabled_at = now(),
      revoked_at = null
  where order_id = target_order_id
  returning * into delivery_record;
  if delivery_record.id is null then
    raise exception 'delivery_not_found';
  end if;

  update public.orders
  set status = 'delivered', updated_at = now()
  where id = target_order_id;

  return jsonb_build_object(
    'delivery_id', delivery_record.id,
    'dedication', delivery_record.dedication,
    'share_enabled_at', delivery_record.share_enabled_at
  );
end;
$$;

revoke all on function public.rotate_delivery_share(uuid, text, text) from public;
grant execute on function public.rotate_delivery_share(uuid, text, text) to authenticated;

create or replace function public.revoke_delivery_share(target_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  update public.deliveries delivery
  set revoked_at = now()
  where delivery.order_id = target_order_id
    and exists (
      select 1 from public.orders order_row
      where order_row.id = delivery.order_id
        and order_row.owner_id = auth.uid()
    );
  return found;
end;
$$;

revoke all on function public.revoke_delivery_share(uuid) from public;
grant execute on function public.revoke_delivery_share(uuid) to authenticated;

create or replace function public.get_shared_present(target_token_hash text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object(
      'found', true,
      'delivery_id', delivery.id,
      'recipient_name', order_row.recipient_name,
      'title', coalesce(version.title, 'Sua música personalizada'),
      'duration_seconds', version.duration_seconds,
      'dedication', delivery.dedication
    )
    from public.deliveries delivery
    join public.orders order_row on order_row.id = delivery.order_id
    join public.music_versions version
      on version.id = delivery.version_id and version.order_id = delivery.order_id
    where delivery.share_token_hash = target_token_hash
      and delivery.share_enabled_at is not null
      and delivery.revoked_at is null
      and order_row.status in ('paid', 'delivered')
  ), jsonb_build_object('found', false));
$$;

revoke all on function public.get_shared_present(text) from public;
grant execute on function public.get_shared_present(text) to service_role;

create or replace function public.get_shared_present_audio(target_token_hash text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object(
      'found', true,
      'delivery_id', delivery.id,
      'order_id', delivery.order_id,
      'version_id', delivery.version_id,
      'object_key', delivery.full_audio_object_key
    )
    from public.deliveries delivery
    join public.orders order_row on order_row.id = delivery.order_id
    where delivery.share_token_hash = target_token_hash
      and delivery.share_enabled_at is not null
      and delivery.revoked_at is null
      and order_row.status in ('paid', 'delivered')
      and delivery.full_audio_object_key = 'orders/' || delivery.order_id::text ||
        '/versions/' || delivery.version_id::text || '/full.mp3'
  ), jsonb_build_object('found', false));
$$;

revoke all on function public.get_shared_present_audio(text) from public;
grant execute on function public.get_shared_present_audio(text) to service_role;

create or replace function public.record_delivery_access(target_delivery_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_order_id uuid;
begin
  update public.deliveries
  set first_accessed_at = coalesce(first_accessed_at, now())
  where id = target_delivery_id
  returning order_id into affected_order_id;
  if affected_order_id is null then
    return false;
  end if;
  update public.orders
  set status = 'delivered', updated_at = now()
  where id = affected_order_id and status = 'paid';
  return true;
end;
$$;

revoke all on function public.record_delivery_access(uuid) from public;
grant execute on function public.record_delivery_access(uuid) to service_role;

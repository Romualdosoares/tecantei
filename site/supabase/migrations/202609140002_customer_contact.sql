-- Nome e WhatsApp do cliente ficam no perfil privado. O trigger copia somente
-- os metadados validados pela interface; nenhuma informação é exposta a anon.

alter table public.profiles
  add column if not exists whatsapp text;

alter table public.profiles
  drop constraint if exists profiles_whatsapp_format_check;
alter table public.profiles
  add constraint profiles_whatsapp_format_check
  check (whatsapp is null or whatsapp ~ '^\+[1-9][0-9]{9,14}$');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name, whatsapp)
  values (
    new.id,
    nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 100), ''),
    case
      when trim(new.raw_user_meta_data ->> 'whatsapp') ~ '^\+[1-9][0-9]{9,14}$'
        then trim(new.raw_user_meta_data ->> 'whatsapp')
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

grant update (display_name, whatsapp) on public.profiles to authenticated;

comment on column public.profiles.whatsapp is
  'Contato privado em formato E.164; visível ao próprio usuário e a administradores autorizados.';

-- O identificador do pedido e da versão permite uma segunda checagem de
-- pagamento no servidor antes de renderizar o presente compartilhado.
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
      'order_id', delivery.order_id,
      'version_id', delivery.version_id,
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
      and exists (
        select 1 from public.payment_intents payment
        where payment.order_id = delivery.order_id
          and payment.version_id = delivery.version_id
          and payment.status = 'confirmed'
      )
  ), jsonb_build_object('found', false));
$$;

revoke all on function public.get_shared_present(text) from public;
grant execute on function public.get_shared_present(text) to service_role;

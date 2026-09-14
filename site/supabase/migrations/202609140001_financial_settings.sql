-- Configuração financeira central, preço dinâmico e credenciais Pix no Vault.

alter table public.application_settings
  add column if not exists product_price_cents integer not null default 1990,
  add column if not exists payment_provider text not null default 'mercado_pago',
  add column if not exists efi_environment text not null default 'homologation';

alter table public.application_settings
  drop constraint if exists application_settings_product_price_cents_check,
  drop constraint if exists application_settings_payment_provider_check,
  drop constraint if exists application_settings_efi_environment_check,
  add constraint application_settings_product_price_cents_check
    check (product_price_cents between 100 and 1000000),
  add constraint application_settings_payment_provider_check
    check (payment_provider in ('mercado_pago', 'efi')),
  add constraint application_settings_efi_environment_check
    check (efi_environment in ('homologation', 'production'));

create or replace function public.apply_current_product_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_price integer;
begin
  select settings.product_price_cents into current_price
  from public.application_settings settings
  where settings.id = 1;

  if current_price is null or current_price < 100 or current_price > 1000000 then
    raise exception 'invalid_product_price';
  end if;
  new.amount_cents := current_price;
  new.currency := 'BRL';
  return new;
end;
$$;

drop trigger if exists payment_intents_apply_current_price on public.payment_intents;
create trigger payment_intents_apply_current_price
before insert on public.payment_intents
for each row execute function public.apply_current_product_price();

revoke all on function public.apply_current_product_price() from public, anon, authenticated;

create or replace function public.put_app_secret(target_name text, target_value text, target_actor uuid, target_reason text)
returns void
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  existing_id uuid;
  supported_names constant text[] := array[
    'kie_api_key', 'kie_webhook_hmac_key',
    'mercado_pago_access_token', 'mercado_pago_webhook_secret',
    'efi_client_id', 'efi_client_secret', 'efi_pix_key',
    'efi_certificate_p12_base64', 'efi_certificate_passphrase',
    'efi_webhook_token', 'efi_webhook_mtls_gateway_secret'
  ];
begin
  if not (target_name = any(supported_names)) then
    raise exception 'unsupported_secret';
  end if;
  if length(trim(target_value)) < 1
     or (target_name = 'efi_certificate_p12_base64' and length(target_value) > 2000000)
     or (target_name <> 'efi_certificate_p12_base64' and length(target_value) > 4096) then
    raise exception 'invalid_secret';
  end if;
  if length(trim(target_reason)) < 8 or length(target_reason) > 300 then
    raise exception 'invalid_reason';
  end if;

  select id into existing_id from vault.secrets where name = target_name;
  if existing_id is null then
    perform vault.create_secret(target_value, target_name, 'Credencial privada do Te Cantei');
  else
    perform vault.update_secret(existing_id, target_value, target_name, 'Credencial privada do Te Cantei');
  end if;
  insert into public.admin_audit_log(actor_id, action, target_type, target_id, reason, metadata)
  values (target_actor, 'update_api_secret', 'integration_secret', target_name, target_reason, jsonb_build_object('configured', true));
end;
$$;

create or replace function public.get_app_secret(target_name text)
returns text
language plpgsql
stable
security definer
set search_path = public, vault, pg_temp
as $$
declare
  result text;
  supported_names constant text[] := array[
    'kie_api_key', 'kie_webhook_hmac_key',
    'mercado_pago_access_token', 'mercado_pago_webhook_secret',
    'efi_client_id', 'efi_client_secret', 'efi_pix_key',
    'efi_certificate_p12_base64', 'efi_certificate_passphrase',
    'efi_webhook_token', 'efi_webhook_mtls_gateway_secret'
  ];
begin
  if not (target_name = any(supported_names)) then
    raise exception 'unsupported_secret';
  end if;
  select decrypted_secret into result from vault.decrypted_secrets where name = target_name;
  return result;
end;
$$;

create or replace function public.delete_app_secret(target_name text, target_actor uuid, target_reason text)
returns boolean
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  removed_count integer;
  supported_names constant text[] := array[
    'kie_api_key', 'kie_webhook_hmac_key',
    'mercado_pago_access_token', 'mercado_pago_webhook_secret',
    'efi_client_id', 'efi_client_secret', 'efi_pix_key',
    'efi_certificate_p12_base64', 'efi_certificate_passphrase',
    'efi_webhook_token', 'efi_webhook_mtls_gateway_secret'
  ];
begin
  if not (target_name = any(supported_names)) then
    raise exception 'unsupported_secret';
  end if;
  if length(trim(target_reason)) < 8 or length(target_reason) > 300 then
    raise exception 'invalid_reason';
  end if;
  delete from vault.secrets where name = target_name;
  get diagnostics removed_count = row_count;
  insert into public.admin_audit_log(actor_id, action, target_type, target_id, reason, metadata)
  values (target_actor, 'delete_api_secret', 'integration_secret', target_name, target_reason, jsonb_build_object('configured', false));
  return removed_count > 0;
end;
$$;

revoke all on function public.put_app_secret(text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.get_app_secret(text) from public, anon, authenticated;
revoke all on function public.delete_app_secret(text, uuid, text) from public, anon, authenticated;
grant execute on function public.put_app_secret(text, text, uuid, text) to service_role;
grant execute on function public.get_app_secret(text) to service_role;
grant execute on function public.delete_app_secret(text, uuid, text) to service_role;

comment on column public.application_settings.product_price_cents is
  'Preço vigente para novos pedidos; intenções já criadas preservam o valor contratado.';
comment on column public.application_settings.payment_provider is
  'Gateway Pix escolhido para novas cobranças.';

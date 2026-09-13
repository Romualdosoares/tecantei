-- Permite armazenar também o segredo HMAC oficial da Kie.ai no Vault.

create or replace function public.put_app_secret(target_name text, target_value text, target_actor uuid, target_reason text)
returns void
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  existing_id uuid;
  secret_description text;
begin
  if target_name not in ('kie_api_key', 'kie_webhook_hmac_key') then
    raise exception 'unsupported_secret';
  end if;
  if target_name = 'kie_api_key' and (length(trim(target_value)) < 16 or length(target_value) > 512) then
    raise exception 'invalid_secret';
  end if;
  if target_name = 'kie_webhook_hmac_key' and (length(trim(target_value)) < 32 or length(target_value) > 512) then
    raise exception 'invalid_secret';
  end if;
  if length(trim(target_reason)) < 8 or length(target_reason) > 300 then
    raise exception 'invalid_reason';
  end if;

  secret_description := case target_name
    when 'kie_api_key' then 'Credencial Kie.ai do Te Cantei'
    else 'Assinatura HMAC dos callbacks Kie.ai do Te Cantei'
  end;

  select id into existing_id
  from vault.secrets
  where name = target_name;

  if existing_id is null then
    perform vault.create_secret(target_value, target_name, secret_description);
  else
    perform vault.update_secret(existing_id, target_value, target_name, secret_description);
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
begin
  if target_name not in ('kie_api_key', 'kie_webhook_hmac_key') then
    raise exception 'unsupported_secret';
  end if;
  select decrypted_secret into result
  from vault.decrypted_secrets
  where name = target_name;
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
begin
  if target_name not in ('kie_api_key', 'kie_webhook_hmac_key') then
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

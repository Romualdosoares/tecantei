-- GPT via Kie.ai e armazenamento write-only de credenciais no Supabase Vault.

create extension if not exists supabase_vault with schema vault;

alter table public.application_settings
  drop constraint if exists application_settings_lyrics_mode_check,
  drop constraint if exists application_settings_lyrics_model_check,
  drop constraint if exists application_settings_lyrics_reasoning_effort_check;

update public.application_settings
set
  lyrics_mode = case when lyrics_mode = 'openai' then 'kie' else lyrics_mode end,
  lyrics_model = replace(lyrics_model, '.', '-'),
  lyrics_reasoning_effort = case when lyrics_reasoning_effort = 'none' then 'low' else lyrics_reasoning_effort end;

alter table public.application_settings
  alter column lyrics_model set default 'gpt-5-6-terra',
  add constraint application_settings_lyrics_mode_check
    check (lyrics_mode in ('mock','kie')),
  add constraint application_settings_lyrics_model_check
    check (lyrics_model in ('gpt-5-6-sol','gpt-5-6-terra','gpt-5-6-luna','gpt-6-astra')),
  add constraint application_settings_lyrics_reasoning_effort_check
    check (lyrics_reasoning_effort in ('low','medium','high','xhigh'));

create or replace function public.put_app_secret(target_name text, target_value text, target_actor uuid, target_reason text)
returns void
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  existing_id uuid;
begin
  if target_name <> 'kie_api_key' then
    raise exception 'unsupported_secret';
  end if;
  if length(trim(target_value)) < 16 or length(target_value) > 512 then
    raise exception 'invalid_secret';
  end if;
  if length(trim(target_reason)) < 8 or length(target_reason) > 300 then
    raise exception 'invalid_reason';
  end if;

  select id into existing_id
  from vault.secrets
  where name = target_name;

  if existing_id is null then
    perform vault.create_secret(target_value, target_name, 'Credencial Kie.ai do Te Cantei');
  else
    perform vault.update_secret(existing_id, target_value, target_name, 'Credencial Kie.ai do Te Cantei');
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
  if target_name <> 'kie_api_key' then
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
  if target_name <> 'kie_api_key' then
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

comment on table public.application_settings is
  'Seleções não secretas de modelos e modos. A credencial Kie.ai fica no Supabase Vault.';

comment on function public.put_app_secret(text, text, uuid, text) is
  'Grava credencial permitida no Vault; disponível somente ao papel service_role.';
comment on function public.get_app_secret(text) is
  'Lê credencial descriptografada exclusivamente no backend com service_role.';

-- Remove a ambiguidade entre parâmetros e colunas na publicação do áudio.

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
  if $2 <> expected_full_key or $3 <> expected_preview_key then
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
  set full_audio_object_key = $2,
      preview_object_key = $3,
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

revoke all on function public.publish_generation_output(uuid, text, text) from public, anon, authenticated;
grant execute on function public.publish_generation_output(uuid, text, text) to service_role;

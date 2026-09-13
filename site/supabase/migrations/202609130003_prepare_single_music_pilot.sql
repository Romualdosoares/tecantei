-- Prepara o modelo musical real no painel, mantendo a trava externa fechada.

do $$
declare
  admin_id uuid;
begin
  select id into admin_id
  from public.profiles
  where is_admin = true and account_status = 'active'
  order by created_at
  limit 1;

  update public.application_settings
  set
    music_mode = 'live',
    music_model = 'V6',
    updated_by = admin_id,
    updated_at = now()
  where id = 1;

  if admin_id is not null then
    insert into public.admin_audit_log(actor_id, action, target_type, target_id, reason, metadata)
    values (
      admin_id,
      'prepare_single_music_pilot',
      'application_settings',
      '1',
      'Preparar exatamente uma música piloto antes de abrir vendas',
      jsonb_build_object('musicMode', 'live', 'musicModel', 'V6', 'liveGateEnabled', false)
    );
  end if;
end;
$$;

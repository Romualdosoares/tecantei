-- GPT-6.1 Sol usa o identificador gpt-6-1-sol no gateway Kie.ai.
alter table public.application_settings
  drop constraint if exists application_settings_lyrics_model_check;

alter table public.application_settings
  alter column lyrics_model set default 'gpt-6-1-sol',
  alter column lyrics_reasoning_effort set default 'high',
  add constraint application_settings_lyrics_model_check
    check (lyrics_model in ('gpt-5-6-sol','gpt-5-6-terra','gpt-5-6-luna','gpt-6-astra','gpt-6-1-sol'));

-- Escolha solicitada para o compositor; modos e portas de geração são preservados.
update public.application_settings
set lyrics_model = 'gpt-6-1-sol',
    lyrics_reasoning_effort = 'high',
    updated_at = now()
where id = 1;

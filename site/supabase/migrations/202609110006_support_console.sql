-- Acesso explícito da equipe de suporte. Contas comuns não recebem esta
-- capacidade e o navegador nunca recebe a chave service_role.

alter table public.profiles
  add column is_support boolean not null default false;

create index profiles_support_idx on public.profiles(id)
where is_support = true;

comment on column public.profiles.is_support is
  'Concedido somente por operação administrativa fora do navegador.';

-- A concessão existente continua limitada a display_name. Reforçar a
-- proibição para evitar que futuras permissões amplas permitam autoelevação.
revoke update (is_support) on public.profiles from anon, authenticated;


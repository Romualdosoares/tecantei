-- Painel administrativo, configurações operacionais e métricas próprias.
-- Nenhuma credencial é persistida nestas tabelas: chaves continuam no servidor.

alter table public.profiles
  add column is_admin boolean not null default false,
  add column account_status text not null default 'active'
    check (account_status in ('active','suspended','deleted'));

create index profiles_admin_idx on public.profiles(id)
where is_admin = true;

revoke update (is_admin, is_support, account_status)
on public.profiles from anon, authenticated;

create table public.application_settings (
  id smallint primary key default 1 check (id = 1),
  lyrics_mode text not null default 'mock'
    check (lyrics_mode in ('mock','openai')),
  lyrics_model text not null default 'gpt-5.6-terra'
    check (lyrics_model in ('gpt-5.6-sol','gpt-5.6-terra','gpt-5.6-luna','gpt-6-astra')),
  lyrics_reasoning_effort text not null default 'low'
    check (lyrics_reasoning_effort in ('none','low','medium','high')),
  music_mode text not null default 'mock'
    check (music_mode in ('mock','live')),
  music_model text not null default 'V6'
    check (music_model in ('V5','V5_5','V6','V6_MINI','V6_WILD')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.application_settings(id) values (1)
on conflict (id) do nothing;

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null
    check (event_type in ('page_view','cta_create_music','funnel_step','checkout_open','purchase_confirmed')),
  path text not null check (length(path) between 1 and 200),
  session_hash text not null check (session_hash ~ '^[a-f0-9]{64}$'),
  owner_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object')
);
create index analytics_events_created_idx on public.analytics_events(created_at desc);
create index analytics_events_type_created_idx on public.analytics_events(event_type, created_at desc);
create index analytics_events_session_created_idx on public.analytics_events(session_hash, created_at desc);

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id text,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(metadata) = 'object')
);
create index admin_audit_created_idx on public.admin_audit_log(created_at desc);
create index admin_audit_actor_created_idx on public.admin_audit_log(actor_id, created_at desc);

alter table public.application_settings enable row level security;
alter table public.analytics_events enable row level security;
alter table public.admin_audit_log enable row level security;

revoke all on public.application_settings, public.analytics_events, public.admin_audit_log
from anon, authenticated;

comment on column public.profiles.is_admin is
  'Concedido somente por uma operação administrativa autenticada ou bootstrap manual.';
comment on column public.profiles.account_status is
  'Estado operacional; exclusão preserva histórico financeiro e de geração.';
comment on table public.application_settings is
  'Seleções não secretas de modelos e modos. Credenciais permanecem em variáveis do servidor.';


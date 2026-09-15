-- Vitrine da página inicial: até 6 músicas reais de clientes escolhidas pelo admin
-- para a seção "Músicas criadas". Leitura e escrita somente via service role
-- (painel administrativo e renderização server-side da home).

create table if not exists public.home_showcase (
  order_id uuid primary key references public.orders(id) on delete cascade,
  version_id uuid not null references public.music_versions(id) on delete cascade,
  position smallint not null check (position between 1 and 6),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists home_showcase_position_idx on public.home_showcase(position);

alter table public.home_showcase enable row level security;

revoke all on public.home_showcase from anon, authenticated;

comment on table public.home_showcase is
  'Até 6 músicas de clientes destacadas pelo admin na seção "Músicas criadas" da página inicial.';

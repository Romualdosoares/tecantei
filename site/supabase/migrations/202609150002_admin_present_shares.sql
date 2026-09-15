-- Links criados deliberadamente pelo administrador para versões já armazenadas.
-- Permanecem separados da entrega comercial, de modo que não confirmam pagamento,
-- não alteram a versão comprada e não mudam o estado do pedido.

create table public.admin_present_shares (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  version_id uuid not null,
  share_token_hash text not null unique check (share_token_hash ~ '^[a-f0-9]{64}$'),
  dedication text not null check (char_length(dedication) between 1 and 500),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_accessed_at timestamptz,
  revoked_at timestamptz,
  foreign key (version_id, order_id)
    references public.music_versions(id, order_id) on delete cascade
);

create index admin_present_shares_version_idx
  on public.admin_present_shares(version_id);

alter table public.admin_present_shares enable row level security;
revoke all on public.admin_present_shares from anon, authenticated;

comment on table public.admin_present_shares is
  'Compartilhamentos explícitos e auditados do administrador; não representam pagamento ou entrega comercial.';

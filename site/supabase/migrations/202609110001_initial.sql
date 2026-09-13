-- Te Cantei — esquema inicial para Supabase/PostgreSQL.
-- O aplicativo usa o usuário autenticado como proprietário e mantém áudio em
-- bucket privado. Escritas de negócio passam por rotas de servidor ou RPCs
-- estreitas; a chave secreta nunca pertence ao cliente.

create extension if not exists pgcrypto with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  client_request_id uuid not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft','lyrics_review','lyrics_approved','generating','preview_ready','payment_pending','paid','delivered','cancelled')),
  occasion text not null,
  recipient_name text not null,
  pronunciation text,
  story text not null,
  style text not null,
  adjustment_status text not null default 'unavailable'
    check (adjustment_status in ('unavailable','available','reserved','completed')),
  preview_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_owner_updated_idx on public.orders(owner_id, updated_at desc);
create index orders_status_idx on public.orders(status);

create table public.lyrics (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null check (kind in ('source','proposed','approved')),
  revision integer not null check (revision > 0),
  content text not null,
  created_at timestamptz not null default now(),
  unique (order_id, kind, revision),
  unique (id, order_id)
);
create index lyrics_order_created_idx on public.lyrics(order_id, created_at desc);

create table public.music_versions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  approved_lyric_id uuid not null,
  origin text not null check (origin in ('original','adjustment')),
  status text not null default 'queued'
    check (status in ('queued','generating','ready','failed')),
  title text,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  provider_audio_id text unique,
  full_audio_object_key text,
  preview_object_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, order_id),
  foreign key (approved_lyric_id, order_id)
    references public.lyrics(id, order_id)
);
create index music_versions_order_created_idx on public.music_versions(order_id, created_at desc);

create table public.generation_tasks (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  approved_lyric_id uuid,
  version_id uuid,
  request_key text not null unique,
  provider text not null default 'kie.ai',
  model text not null,
  external_task_id text,
  status text not null default 'created'
    check (status in ('created','submitted','processing','reconciling','succeeded','failed')),
  error_code text,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_task_id),
  unique (id, order_id),
  foreign key (approved_lyric_id, order_id)
    references public.lyrics(id, order_id),
  foreign key (version_id, order_id)
    references public.music_versions(id, order_id)
);
create index generation_tasks_order_created_idx on public.generation_tasks(order_id, created_at desc);

create table public.generation_outputs (
  id uuid primary key default gen_random_uuid(),
  generation_task_id uuid not null references public.generation_tasks(id) on delete cascade,
  version_id uuid not null unique references public.music_versions(id) on delete cascade,
  provider_audio_id text not null,
  source_audio_url text not null,
  storage_status text not null default 'pending'
    check (storage_status in ('pending','stored','failed')),
  storage_attempts integer not null default 0 check (storage_attempts >= 0),
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (generation_task_id, provider_audio_id)
);
create index generation_outputs_storage_idx on public.generation_outputs(storage_status, updated_at);

create table public.adjustment_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  source_version_id uuid not null,
  result_version_id uuid,
  status text not null default 'reserved'
    check (status in ('reserved','processing','completed','technical_failure','reconciling')),
  customer_notes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (source_version_id, order_id)
    references public.music_versions(id, order_id),
  foreign key (result_version_id, order_id)
    references public.music_versions(id, order_id)
);

create table public.order_selections (
  order_id uuid primary key references public.orders(id) on delete cascade,
  version_id uuid not null,
  selected_at timestamptz not null default now(),
  foreign key (version_id, order_id)
    references public.music_versions(id, order_id)
);

create table public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  version_id uuid not null,
  provider text not null,
  external_payment_id text,
  amount_cents integer not null default 1990 check (amount_cents > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  status text not null default 'created'
    check (status in ('created','pending','confirmed','failed','cancelled','refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_payment_id),
  foreign key (version_id, order_id)
    references public.music_versions(id, order_id)
);
create index payment_intents_order_created_idx on public.payment_intents(order_id, created_at desc);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_intent_id uuid not null references public.payment_intents(id) on delete cascade,
  provider text not null,
  external_event_id text not null,
  event_type text not null,
  payload_hash text not null,
  occurred_at timestamptz not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, external_event_id)
);
create index payment_events_intent_created_idx on public.payment_events(payment_intent_id, created_at desc);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  version_id uuid not null,
  full_audio_object_key text not null,
  share_token_hash text not null unique,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (version_id, order_id)
    references public.music_versions(id, order_id)
);

create table public.cost_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  generation_task_id uuid references public.generation_tasks(id),
  provider text not null,
  operation text not null,
  credits_millis bigint not null check (credits_millis >= 0),
  usd_micros bigint check (usd_micros is null or usd_micros >= 0),
  status text not null check (status in ('estimated','confirmed','refunded','reconciling')),
  created_at timestamptz not null default now()
);
create index cost_events_order_created_idx on public.cost_events(order_id, created_at desc);

create table public.support_audit_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_subject text not null,
  action text not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index support_audit_order_created_idx on public.support_audit_log(order_id, created_at desc);

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();
create trigger music_versions_set_updated_at before update on public.music_versions
for each row execute function public.set_updated_at();
create trigger generation_tasks_set_updated_at before update on public.generation_tasks
for each row execute function public.set_updated_at();
create trigger generation_outputs_set_updated_at before update on public.generation_outputs
for each row execute function public.set_updated_at();
create trigger adjustment_requests_set_updated_at before update on public.adjustment_requests
for each row execute function public.set_updated_at();
create trigger payment_intents_set_updated_at before update on public.payment_intents
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.owns_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1 from public.orders
    where id = target_order_id and owner_id = auth.uid()
  );
$$;

revoke all on function public.owns_order(uuid) from public;
grant execute on function public.owns_order(uuid) to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.lyrics enable row level security;
alter table public.music_versions enable row level security;
alter table public.generation_tasks enable row level security;
alter table public.generation_outputs enable row level security;
alter table public.adjustment_requests enable row level security;
alter table public.order_selections enable row level security;
alter table public.payment_intents enable row level security;
alter table public.payment_events enable row level security;
alter table public.deliveries enable row level security;
alter table public.cost_events enable row level security;
alter table public.support_audit_log enable row level security;

create policy profiles_select_own on public.profiles
for select to authenticated using (auth.uid() is not null and id = auth.uid());
create policy profiles_update_own on public.profiles
for update to authenticated
using (auth.uid() is not null and id = auth.uid())
with check (auth.uid() is not null and id = auth.uid());

create policy orders_select_own on public.orders
for select to authenticated using (auth.uid() is not null and owner_id = auth.uid());
create policy orders_insert_own on public.orders
for insert to authenticated with check (auth.uid() is not null and owner_id = auth.uid());
create policy orders_update_own on public.orders
for update to authenticated
using (auth.uid() is not null and owner_id = auth.uid())
with check (auth.uid() is not null and owner_id = auth.uid());

create policy lyrics_select_own on public.lyrics
for select to authenticated using (public.owns_order(order_id));
create policy music_versions_select_own on public.music_versions
for select to authenticated using (public.owns_order(order_id));
create policy generation_tasks_select_own on public.generation_tasks
for select to authenticated using (public.owns_order(order_id));
create policy generation_outputs_select_own on public.generation_outputs
for select to authenticated using (
  exists (
    select 1 from public.generation_tasks task
    where task.id = generation_task_id and public.owns_order(task.order_id)
  )
);
create policy adjustment_requests_select_own on public.adjustment_requests
for select to authenticated using (public.owns_order(order_id));
create policy order_selections_select_own on public.order_selections
for select to authenticated using (public.owns_order(order_id));
create policy payment_intents_select_own on public.payment_intents
for select to authenticated using (public.owns_order(order_id));
create policy payment_events_select_own on public.payment_events
for select to authenticated using (
  exists (
    select 1 from public.payment_intents payment
    where payment.id = payment_intent_id and public.owns_order(payment.order_id)
  )
);
create policy deliveries_select_own on public.deliveries
for select to authenticated using (public.owns_order(order_id));
create policy cost_events_select_own on public.cost_events
for select to authenticated using (public.owns_order(order_id));

-- Nada é exposto a visitantes anônimos. O cliente autenticado lê apenas as
-- superfícies necessárias; URLs temporárias, eventos, entregas e custos ficam
-- exclusivamente no servidor mesmo que tenham políticas defensivas de RLS.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.profiles, public.orders, public.lyrics,
  public.music_versions, public.generation_tasks,
  public.adjustment_requests, public.order_selections,
  public.payment_intents to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Sem políticas em storage.objects: somente o servidor, depois de validar o
-- proprietário, cria URLs assinadas curtas ou transmite o arquivo.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'te-cantei-audio',
  'te-cantei-audio',
  false,
  26214400,
  array['audio/mpeg']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.approve_new_order(
  request_id uuid,
  order_occasion text,
  recipient text,
  recipient_pronunciation text,
  customer_story text,
  music_style text,
  approved_content text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order_id uuid;
  new_approved_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select orders.id into new_order_id
  from public.orders
  where client_request_id = request_id and owner_id = auth.uid();
  if new_order_id is not null then
    select lyrics.id into new_approved_id
    from public.lyrics
    where order_id = new_order_id and kind = 'approved'
    order by revision desc limit 1;
    return jsonb_build_object(
      'order_id', new_order_id,
      'approved_lyric_id', new_approved_id
    );
  end if;

  if order_occasion not in ('Aniversário','Casal','Família','Amizade','Homenagem') then
    raise exception 'invalid_occasion';
  end if;
  if length(trim(recipient)) < 1 or length(recipient) > 120 then
    raise exception 'invalid_recipient';
  end if;
  if recipient_pronunciation is not null and length(recipient_pronunciation) > 200 then
    raise exception 'invalid_pronunciation';
  end if;
  if length(customer_story) < 200 or length(customer_story) > 4000 then
    raise exception 'invalid_story';
  end if;
  if music_style not in ('Pop romântico','MPB','Sertanejo','Pagode','Acústico','Gospel') then
    raise exception 'invalid_style';
  end if;
  if length(approved_content) < 100 or length(approved_content) > 5000 then
    raise exception 'invalid_lyrics';
  end if;

  insert into public.orders (
    client_request_id, owner_id, status, occasion, recipient_name,
    pronunciation, story, style
  )
  values (
    request_id, auth.uid(), 'lyrics_approved', order_occasion, trim(recipient),
    nullif(trim(recipient_pronunciation), ''), customer_story, music_style
  )
  returning id into new_order_id;

  insert into public.lyrics(order_id, kind, revision, content)
  values
    (new_order_id, 'source', 1, customer_story),
    (new_order_id, 'proposed', 1, approved_content);

  insert into public.lyrics(order_id, kind, revision, content)
  values (new_order_id, 'approved', 1, approved_content)
  returning id into new_approved_id;

  return jsonb_build_object(
    'order_id', new_order_id,
    'approved_lyric_id', new_approved_id
  );
end;
$$;

revoke all on function public.approve_new_order(uuid, text, text, text, text, text, text) from public;
grant execute on function public.approve_new_order(uuid, text, text, text, text, text, text) to authenticated;

create or replace function public.reserve_adjustment(
  target_order_id uuid,
  target_source_version_id uuid,
  notes text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_id uuid := gen_random_uuid();
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;
  if length(trim(notes)) < 3 or length(notes) > 2000 then
    raise exception 'invalid_adjustment_notes';
  end if;
  if not exists (
    select 1 from public.music_versions version
    where version.id = target_source_version_id
      and version.order_id = target_order_id
      and version.status = 'ready'
  ) then
    raise exception 'source_version_unavailable';
  end if;

  update public.orders
  set adjustment_status = 'reserved', updated_at = now()
  where id = target_order_id
    and owner_id = auth.uid()
    and adjustment_status = 'available';

  if not found then
    raise exception 'adjustment_unavailable';
  end if;

  insert into public.adjustment_requests(
    id, order_id, source_version_id, customer_notes
  ) values (
    request_id, target_order_id, target_source_version_id, trim(notes)
  );

  return request_id;
end;
$$;

revoke all on function public.reserve_adjustment(uuid, uuid, text) from public;
grant execute on function public.reserve_adjustment(uuid, uuid, text) to authenticated;

-- Revisões explícitas do briefing e da letra antes da primeira geração.
-- As funções derivam o proprietário de auth.uid(), bloqueiam pedidos que já
-- entraram na geração e criam novos registros em vez de sobrescrever o texto.

create or replace function public.revise_order_briefing(
  target_order_id uuid,
  order_occasion text,
  recipient text,
  recipient_pronunciation text,
  customer_story text,
  music_style text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_revision integer;
  new_source_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  perform 1 from public.orders
  where id = target_order_id
    and owner_id = auth.uid()
    and status in ('draft', 'lyrics_review', 'lyrics_approved')
  for update;
  if not found then
    raise exception 'order_not_editable';
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

  select coalesce(max(revision), 0) + 1 into next_revision
  from public.lyrics
  where order_id = target_order_id and kind = 'source';

  insert into public.lyrics(order_id, kind, revision, content)
  values (target_order_id, 'source', next_revision, customer_story)
  returning id into new_source_id;

  update public.orders
  set occasion = order_occasion,
      recipient_name = trim(recipient),
      pronunciation = nullif(trim(recipient_pronunciation), ''),
      story = customer_story,
      style = music_style,
      status = 'draft',
      updated_at = now()
  where id = target_order_id;

  return jsonb_build_object(
    'order_id', target_order_id,
    'source_lyric_id', new_source_id,
    'revision', next_revision,
    'status', 'draft'
  );
end;
$$;

revoke all on function public.revise_order_briefing(uuid, text, text, text, text, text) from public;
grant execute on function public.revise_order_briefing(uuid, text, text, text, text, text) to authenticated;

create or replace function public.propose_lyrics_revision(
  target_order_id uuid,
  proposed_content text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_revision integer;
  new_proposed_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  perform 1 from public.orders
  where id = target_order_id
    and owner_id = auth.uid()
    and status in ('draft', 'lyrics_review', 'lyrics_approved')
  for update;
  if not found then
    raise exception 'order_not_editable';
  end if;
  if length(proposed_content) < 100 or length(proposed_content) > 5000 then
    raise exception 'invalid_lyrics';
  end if;

  select coalesce(max(revision), 0) + 1 into next_revision
  from public.lyrics
  where order_id = target_order_id and kind = 'proposed';

  insert into public.lyrics(order_id, kind, revision, content)
  values (target_order_id, 'proposed', next_revision, proposed_content)
  returning id into new_proposed_id;

  update public.orders
  set status = 'lyrics_review', updated_at = now()
  where id = target_order_id;

  return jsonb_build_object(
    'order_id', target_order_id,
    'proposed_lyric_id', new_proposed_id,
    'revision', next_revision,
    'status', 'lyrics_review'
  );
end;
$$;

revoke all on function public.propose_lyrics_revision(uuid, text) from public;
grant execute on function public.propose_lyrics_revision(uuid, text) to authenticated;

create or replace function public.approve_latest_lyrics(
  target_order_id uuid,
  target_proposed_lyric_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  proposed_text text;
  next_revision integer;
  new_approved_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  perform 1 from public.orders
  where id = target_order_id
    and owner_id = auth.uid()
    and status = 'lyrics_review'
  for update;
  if not found then
    raise exception 'order_not_approvable';
  end if;

  select content into proposed_text
  from public.lyrics
  where id = target_proposed_lyric_id
    and order_id = target_order_id
    and kind = 'proposed'
    and revision = (
      select max(revision) from public.lyrics
      where order_id = target_order_id and kind = 'proposed'
    );
  if proposed_text is null then
    raise exception 'latest_proposal_required';
  end if;

  select coalesce(max(revision), 0) + 1 into next_revision
  from public.lyrics
  where order_id = target_order_id and kind = 'approved';

  insert into public.lyrics(order_id, kind, revision, content)
  values (target_order_id, 'approved', next_revision, proposed_text)
  returning id into new_approved_id;

  update public.orders
  set status = 'lyrics_approved', updated_at = now()
  where id = target_order_id;

  return jsonb_build_object(
    'order_id', target_order_id,
    'approved_lyric_id', new_approved_id,
    'revision', next_revision,
    'status', 'lyrics_approved'
  );
end;
$$;

revoke all on function public.approve_latest_lyrics(uuid, uuid) from public;
grant execute on function public.approve_latest_lyrics(uuid, uuid) to authenticated;

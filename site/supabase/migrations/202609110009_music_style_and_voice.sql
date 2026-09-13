-- Ritmos livres e preferência de voz passam a fazer parte do briefing persistido.

alter table public.orders
  add column voice_preference text not null default 'feminina'
  check (voice_preference in ('masculina', 'feminina'));

drop function if exists public.approve_new_order(uuid, text, text, text, text, text, text);

create function public.approve_new_order(
  request_id uuid,
  order_occasion text,
  recipient text,
  recipient_pronunciation text,
  customer_story text,
  music_style text,
  voice_choice text,
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

  if length(trim(order_occasion)) < 1 or length(order_occasion) > 80 then
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
  if length(trim(music_style)) < 1 or length(music_style) > 120 then
    raise exception 'invalid_style';
  end if;
  if voice_choice not in ('masculina', 'feminina') then
    raise exception 'invalid_voice';
  end if;
  if length(approved_content) < 100 or length(approved_content) > 5000 then
    raise exception 'invalid_lyrics';
  end if;

  insert into public.orders (
    client_request_id, owner_id, status, occasion, recipient_name,
    pronunciation, story, style, voice_preference
  )
  values (
    request_id, auth.uid(), 'lyrics_approved', trim(order_occasion), trim(recipient),
    nullif(trim(recipient_pronunciation), ''), customer_story, trim(music_style), voice_choice
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

revoke all on function public.approve_new_order(uuid, text, text, text, text, text, text, text) from public;
grant execute on function public.approve_new_order(uuid, text, text, text, text, text, text, text) to authenticated;

drop function if exists public.revise_order_briefing(uuid, text, text, text, text, text);

create function public.revise_order_briefing(
  target_order_id uuid,
  order_occasion text,
  recipient text,
  recipient_pronunciation text,
  customer_story text,
  music_style text,
  voice_choice text
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

  if length(trim(order_occasion)) < 1 or length(order_occasion) > 80 then
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
  if length(trim(music_style)) < 1 or length(music_style) > 120 then
    raise exception 'invalid_style';
  end if;
  if voice_choice not in ('masculina', 'feminina') then
    raise exception 'invalid_voice';
  end if;

  select coalesce(max(revision), 0) + 1 into next_revision
  from public.lyrics
  where order_id = target_order_id and kind = 'source';

  insert into public.lyrics(order_id, kind, revision, content)
  values (target_order_id, 'source', next_revision, customer_story)
  returning id into new_source_id;

  update public.orders
  set occasion = trim(order_occasion),
      recipient_name = trim(recipient),
      pronunciation = nullif(trim(recipient_pronunciation), ''),
      story = customer_story,
      style = trim(music_style),
      voice_preference = voice_choice,
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

revoke all on function public.revise_order_briefing(uuid, text, text, text, text, text, text) from public;
grant execute on function public.revise_order_briefing(uuid, text, text, text, text, text, text) to authenticated;

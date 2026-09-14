-- Pedido sintético e idempotente usado por uma única geração musical piloto.

create or replace function public.prepare_single_music_pilot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  pilot_request_id constant uuid := 'c2e3b19e-6002-4f5f-b10d-66e0a0a8c901';
  pilot_owner_id uuid;
  pilot_order_id uuid;
  pilot_lyric_id uuid;
  pilot_story constant text := 'Este é um pedido técnico do Te Cantei criado somente para validar a primeira música completa em produção. A história celebra o cuidado de transformar lembranças simples em uma canção: conversas tranquilas, apoio nos dias difíceis, risadas inesperadas e a certeza de que os bons momentos merecem permanecer. Não representa uma pessoa real e não contém dados pessoais de clientes.';
  pilot_lyrics constant text := '[Verso 1]
Entre palavras, risos e caminhos
Uma lembrança encontra o seu lugar
Cada detalhe, cada gesto de carinho
Vira melodia para sempre guardar

[Pré-refrão]
Quando o tempo passa, o coração recorda
Tudo aquilo que nos fez chegar aqui

[Refrão]
Nossa história virou canção
Feita de afeto, memória e emoção
Te Cantei, para o tempo não apagar
O que o coração escolheu guardar

[Verso 2]
Nos dias simples mora a nossa história
Na voz serena, no abraço e no olhar
Hoje celebramos toda essa memória
Em uma música que sempre vai ficar

[Ponte]
Se a distância vier, é só ouvir
Cada nota vai nos reunir

[Refrão]
Nossa história virou canção
Feita de afeto, memória e emoção
Te Cantei, para o tempo não apagar
O que o coração escolheu guardar';
begin
  select id into pilot_order_id
  from public.orders
  where client_request_id = pilot_request_id;

  if pilot_order_id is null then
    select id into pilot_owner_id
    from public.profiles
    where is_admin = true and account_status = 'active'
    order by created_at
    limit 1;
    if pilot_owner_id is null then
      raise exception 'active_admin_required';
    end if;

    insert into public.orders(
      client_request_id, owner_id, status, occasion, recipient_name,
      pronunciation, story, style, voice_preference
    ) values (
      pilot_request_id, pilot_owner_id, 'lyrics_approved', 'Piloto técnico',
      'Te Cantei', null, pilot_story, 'Pop romântico', 'feminina'
    ) returning id into pilot_order_id;

    insert into public.lyrics(order_id, kind, revision, content)
    values
      (pilot_order_id, 'source', 1, pilot_story),
      (pilot_order_id, 'proposed', 1, pilot_lyrics);

    insert into public.lyrics(order_id, kind, revision, content)
    values (pilot_order_id, 'approved', 1, pilot_lyrics)
    returning id into pilot_lyric_id;

    insert into public.admin_audit_log(actor_id, action, target_type, target_id, reason, metadata)
    values (
      pilot_owner_id,
      'prepare_single_music_pilot',
      'order',
      pilot_order_id::text,
      'Executar exatamente uma geração musical piloto antes de abrir vendas',
      jsonb_build_object('synthetic', true, 'containsCustomerData', false)
    );
  else
    select id into pilot_lyric_id
    from public.lyrics
    where order_id = pilot_order_id and kind = 'approved'
    order by revision desc
    limit 1;
  end if;

  return jsonb_build_object(
    'order_id', pilot_order_id,
    'approved_lyric_id', pilot_lyric_id,
    'request_id', pilot_request_id
  );
end;
$$;

revoke all on function public.prepare_single_music_pilot() from public, anon, authenticated;
grant execute on function public.prepare_single_music_pilot() to service_role;

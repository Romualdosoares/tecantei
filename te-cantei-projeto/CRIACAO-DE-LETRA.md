# Criação da letra

Atualizado em 13/09/2026.

## Estado atual

O Te Cantei possui dois modos de criação da letra: simulação local e GPT pela API da Kie.ai. O painel `/admin` permite escolher GPT-5.6 Luna, Terra ou Sol, e GPT-6 Astra, além do esforço de raciocínio. O padrão operacional é GPT-5.6 Terra com esforço baixo; sem credencial ou sem a trava explícita do ambiente, o produto continua em simulação.

A ativação real exige simultaneamente:

- chave da Kie.ai cadastrada no campo protegido do painel ou em `KIE_API_KEY` no servidor;
- `KIE_LIVE_LYRICS_ENABLED=true` no ambiente de produção;
- modo “Kie.ai GPT ao vivo” selecionado por um administrador.

Selecionar o modo ao vivo no banco não vence a trava do ambiente. Quando cadastrada pelo painel, a chave é criptografada no Supabase Vault, não aparece em `application_settings` e nunca é devolvida ao navegador.

## Fluxo

1. O navegador envia ocasião, destinatário, pronúncia, história, estilo e preferência de voz para `POST /api/lyrics/draft`.
2. A rota limita o corpo a 8 KiB e valida os campos no servidor.
3. Em simulação, o gerador local cria um rascunho determinístico. No modo real, o servidor usa `POST https://api.kie.ai/codex/v1/responses`.
4. Instruções fixas tratam a história como conteúdo e proíbem invenção de fatos; o briefing não pode alterar as regras do sistema.
5. A resposta informa o modo usado. A pessoa pode editar toda a letra antes da aprovação.
6. Criar ou editar o rascunho não inicia a geração musical e não consome o ajuste incluído.

## Limites e proteção

- destinatário: de 1 a 120 caracteres;
- pronúncia: até 200 caracteres;
- história: de 200 a 4.000 caracteres;
- corpo total da requisição: até 8 KiB;
- resposta real validada entre 200 e 8.000 caracteres;
- nenhum briefing, letra ou chave aparece no painel de métricas;
- a criação da letra e a criação da música usam operações separadas da Kie.ai: aprovar texto nunca inicia música involuntariamente.

Fontes consultadas na implementação:

- [Kie.ai — GPT-5.6 Luna e endpoint Responses](https://docs.kie.ai/market/chat/gpt-5-6-luna)
- [Kie.ai — primeiros passos e proteção da chave](https://docs.kie.ai/)
- [Supabase — Vault](https://supabase.com/docs/guides/database/vault)

## Dependências para validação real

A integração está pronta em código, mas só deve ser considerada validada depois de cadastrar uma credencial real, testar a conexão e avaliar custo, latência e qualidade das letras em português com nomes, pronúncias e gêneros brasileiros.

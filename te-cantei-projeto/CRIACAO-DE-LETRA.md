# Criação da letra

Atualizado em 11/09/2026.

## Estado atual

O Te Cantei possui dois modos de criação da letra: simulação local e OpenAI Responses API. O painel `/admin` permite escolher GPT-5.6 Luna, Terra ou Sol, e GPT-6 Astra, além do esforço de raciocínio. O padrão operacional é GPT-5.6 Terra com esforço baixo; sem credencial e sem a trava explícita do ambiente, o produto continua em simulação.

A ativação real exige simultaneamente:

- `OPENAI_API_KEY` configurada somente no servidor;
- `OPENAI_LIVE_ENABLED=true` no ambiente;
- modo “OpenAI ao vivo” selecionado por um administrador.

Selecionar o modo ao vivo no banco não vence a trava do ambiente. A chave nunca é salva no banco nem devolvida ao navegador.

## Fluxo

1. O navegador envia ocasião, destinatário, pronúncia, história, estilo e preferência de voz para `POST /api/lyrics/draft`.
2. A rota limita o corpo a 8 KiB e valida os campos no servidor.
3. Em simulação, o gerador local cria um rascunho determinístico. No modo real, o servidor usa `POST /v1/responses` com `store: false`.
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
- a OpenAI e a Kie.ai são integrações separadas: texto aprovado nunca inicia música involuntariamente.

Fontes consultadas na implementação:

- [OpenAI — modelos atuais](https://developers.openai.com/api/docs/models)
- [OpenAI — Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)

## Dependências para validação real

A integração está pronta em código, mas ainda não foi chamada com uma credencial real. Antes da produção, aplicar a migração administrativa no Supabase de teste, configurar a chave em ambiente de preview, validar custo/latência e avaliar letras em português com nomes, pronúncias e gêneros brasileiros.


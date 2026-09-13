# Preparação para publicação

Atualizado em 11/09/2026.

Este documento separa três resultados diferentes: projeto local validado, ambiente de preview integrado e produção apta a receber clientes. Nenhum projeto externo é criado por este procedimento.

## Comando canônico

Executar dentro de `site/`:

```powershell
npm.cmd run preflight
npm.cmd run preflight -- --target=preview
npm.cmd run preflight -- --target=production
```

O alvo padrão é `local`. O comando carrega, quando existirem, `.env`, `.env.local`, `.env.<alvo>` e `.env.<alvo>.local`, com as variáveis do processo tendo precedência. Valores de segredos nunca são impressos.

Resultados:

- `PASS`: requisito satisfeito;
- `AVISO`: não impede esse alvo, mas exige acompanhamento;
- `BLOQUEIO`: impede considerar o alvo pronto e faz o comando terminar com código 1.

## Situação dos alvos

| Alvo | Finalidade | Estado atual |
|---|---|---|
| `local` | Desenvolvimento, testes e build sem consumo ou cobrança | Pronto; simulações e travas foram verificadas. |
| `preview` | Supabase real de teste e fluxo integrado sem consumo Kie.ai nem cobrança real | Aguardando projeto Supabase, segredos e URL HTTPS de preview. |
| `production` | Venda e entrega reais | Bloqueado até integrar provedor de letra, pagamento real, teste Kie.ai autorizado e piloto ponta a ponta. |

Publicar um preview não equivale a liberar o produto para venda.

## Ordem das migrações Supabase

Aplicar uma única vez, na ordem dos nomes:

1. `202609110001_initial.sql`
2. `202609110002_order_revisions.sql`
3. `202609110003_generation_flow.sql`
4. `202609110004_payment_foundation.sql`
5. `202609110005_delivery_sharing.sql`
6. `202609110006_support_console.sql`
7. `202609110007_generation_budgets.sql`
8. `202609110008_live_pix_payments.sql`

Depois da aplicação, executar os testes integrados de Auth, RLS, Storage privado, ajuste atômico, pagamento idempotente, compartilhamento e suporte. O preflight confere arquivos e ordem; ele não afirma que as migrações foram aplicadas remotamente.

## Variáveis por responsabilidade

Variáveis públicas, permitidas no navegador:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`

Segredos exclusivos do servidor:

- `SUPABASE_SECRET_KEY`
- `KIE_API_KEY`
- `KIE_WEBHOOK_HMAC_KEY`
- `CRON_SECRET`
- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `EFI_CLIENT_ID`
- `EFI_CLIENT_SECRET`
- `EFI_PIX_KEY`
- `EFI_CERTIFICATE_P12_BASE64`
- `EFI_CERTIFICATE_PASSPHRASE`
- `EFI_WEBHOOK_TOKEN`
- `EFI_WEBHOOK_MTLS_GATEWAY_SECRET`

Configuração operacional do servidor:

- `SUPABASE_AUDIO_BUCKET`
- `LYRICS_GENERATION_MODE`
- `KIE_ALLOWED_AUDIO_HOSTS`
- `KIE_MODEL`
- `KIE_GENERATION_MODE`
- `KIE_LIVE_GENERATION_ENABLED`
- `KIE_GENERATION_CREDITS`
- `GENERATION_BUDGET_SCOPE`
- `GENERATION_ACCOUNT_24H_CREDITS`
- `GENERATION_ENVIRONMENT_24H_CREDITS`
- `PAYMENT_MODE`
- `PAYMENT_LIVE_ENABLED`
- `PAYMENT_MOCK_CONFIRMATION_ENABLED`
- `PAYMENT_PROVIDER`
- `EFI_ENVIRONMENT`
- `EFI_WEBHOOK_MTLS_TERMINATION`

Nunca copiar um segredo para uma variável `NEXT_PUBLIC_*`, arquivo versionado, captura de tela ou documento do projeto.

## Configuração segura do preview

- usar um projeto Supabase exclusivo de teste;
- usar URL HTTPS do deployment de preview;
- manter `LYRICS_GENERATION_MODE=mock`;
- manter `KIE_GENERATION_MODE=mock` e `KIE_LIVE_GENERATION_ENABLED=false`;
- usar `GENERATION_BUDGET_SCOPE=preview`; os limites numéricos só são exigidos quando a Kie.ai estiver live;
- manter `PAYMENT_MODE=mock` e `PAYMENT_LIVE_ENABLED=false`;
- habilitar `PAYMENT_MOCK_CONFIRMATION_ENABLED=true` somente durante o piloto controlado que precisa concluir a entrega simulada;
- gerar `CRON_SECRET` aleatório com pelo menos 24 caracteres;
- não reutilizar segredos de produção.

## Bloqueios conhecidos de produção

- criação real de letra ainda não possui provedor nem política de retenção implementados;
- checkout e webhooks Pix estão conectados localmente, mas ainda precisam de Supabase e ambiente oficial de teste;
- o webhook Efí exige mTLS de entrada; gateway, certificado, segredo interno e bloqueio do acesso direto à origem precisam ser validados antes de usar Efí na Vercel;
- uso real da Kie.ai requer credencial, orçamento autorizado, hosts reais, HMAC e confirmação comercial;
- falta aplicar e testar Auth, RLS e Storage em Supabase real;
- falta um pedido real ponta a ponta com avaliação humana da música;
- termos ao cliente, tratamento de dados, suporte e domínio final precisam de revisão de lançamento.

O preflight de produção deve continuar falhando enquanto esses itens forem verdadeiros. Não contornar os bloqueios apenas alterando variáveis.

## Sequência da fase externa

Quando o usuário autorizar a fase externa:

1. criar o repositório privado no GitHub sem arquivos `.env`;
2. criar o Supabase de teste e aplicar as oito migrações;
3. configurar Auth, bucket privado e variáveis do alvo `preview`;
4. criar o projeto Vercel ligado ao repositório e publicar somente preview;
5. executar `npm.cmd run preflight -- --target=preview` no ambiente configurado;
6. realizar a matriz integrada e corrigir diferenças do ambiente real;
7. conectar o checkout e webhook persistentes ao provedor Pix escolhido e testar no ambiente oficial;
8. autorizar um teste Kie.ai limitado, conciliar custos e avaliar a música;
9. executar o piloto ponta a ponta;
10. somente então tratar o alvo `production`, domínio e abertura de vendas.

Antes de cada envio ao GitHub, conferir que `.env*` continua ignorado, com exceção exclusiva de `.env.example`.

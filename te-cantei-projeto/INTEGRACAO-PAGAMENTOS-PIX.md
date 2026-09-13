# Integração de pagamentos Pix — Efí e Mercado Pago

Atualizado em 11/09/2026. Esta entrega implementa clientes de servidor e validações locais conforme a documentação oficial. Nenhuma conta, credencial, cobrança ou webhook público foi criado.

## Contrato comum do Te Cantei

Os dois provedores recebem a mesma intenção interna: valor inteiro em centavos, referência do pedido, UUID v4 de idempotência, prazo de expiração e, quando exigido, e-mail do pagador. A resposta é normalizada para:

- provedor e identificador externo;
- valor em centavos e moeda BRL;
- estado `pending`, `confirmed`, `failed` ou `refunded`;
- Pix copia e cola, imagem em base64 e URL HTTPS quando o provedor as devolver;
- expiração da cobrança.

O valor continua fixado no servidor em R$ 19,90. O navegador não confirma pagamento e nunca recebe credenciais. Antes de liberar a música, o servidor ainda deverá consultar o pagamento no provedor e conferir valor, moeda e vínculo com pedido/versão.

## Mercado Pago

Implementado em `site/lib/payment/providers/mercado-pago.ts`:

- criação por `POST https://api.mercadopago.com/v1/payments`;
- autenticação `Bearer` com Access Token exclusivo do servidor;
- `payment_method_id=pix`, e-mail do pagador e referência externa do pedido;
- cabeçalho obrigatório `X-Idempotency-Key` com o UUID da intenção local;
- consulta por `GET /v1/payments/{id}` antes de aplicar o resultado;
- normalização de QR Code, expiração e estados.

O verificador em `mercado-pago-webhook.ts` reconstrói o manifesto oficial `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` e valida HMAC-SHA256 em tempo constante. A rota pública busca o pagamento por ID antes de aplicar o estado; o corpo da notificação sozinho não libera a entrega. A validade temporal é opcional porque a documentação prevê novas tentativas após 15 minutos; repetições são neutralizadas pelo identificador persistente do evento.

Variáveis: `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET`.

Fontes oficiais: [criação de pagamento Pix](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/payment-submission/pix), [Webhooks e validação de origem](https://www.mercadopago.com.br/developers/pt/docs/iset/additional-content/your-integrations/notifications/webhooks) e [esquema OpenAPI oficial dos webhooks](https://github.com/mercadopago/openapi/blob/main/schemas/webhooks.yaml).

## Efí Bank

Implementado em `site/lib/payment/providers/efi.ts` e `efi-https-transport.ts`:

- bases separadas de homologação e produção;
- OAuth2 `client_credentials` em `POST /oauth/token` com Basic Auth;
- certificado P12 em mTLS inclusive na autenticação;
- criação idempotente por `PUT /v2/cob/{txid}`;
- `txid` alfanumérico determinístico de 32 caracteres derivado do UUID da intenção;
- valor enviado como `19.90`, chave Pix e referência do pedido;
- consulta por `GET /v2/cob/{txid}` e normalização de estados.

O parser em `efi-webhook.ts` valida a lista `pix`, `endToEndId`, `txid`, valor e horário. A rota exige o HMAC adicional da URL e um segredo injetado pelo gateway que terminou e validou o mTLS, ambos comparados em tempo constante. Essas defesas não substituem o mTLS exigido pela Efí.

Na consulta administrativa, uma cobrança `CONCLUIDA` só é normalizada como reembolsada quando a soma das devoluções com estado `DEVOLVIDO` cobre integralmente o valor original. Devolução parcial permanece confirmada para análise humana; a aplicação não executa nova devolução.

Variáveis: `EFI_ENVIRONMENT`, `EFI_CLIENT_ID`, `EFI_CLIENT_SECRET`, `EFI_PIX_KEY`, `EFI_CERTIFICATE_P12_BASE64`, `EFI_CERTIFICATE_PASSPHRASE`, `EFI_WEBHOOK_TOKEN`, `EFI_WEBHOOK_MTLS_TERMINATION` e `EFI_WEBHOOK_MTLS_GATEWAY_SECRET`.

Fontes oficiais: [credenciais, OAuth2, ambientes e certificado](https://dev.efipay.com.br/docs/api-pix/credenciais/), [cobranças imediatas](https://dev.efipay.com.br/docs/api-pix/cobrancas-imediatas/), [webhooks Pix e mTLS](https://dev.efipay.com.br/docs/api-pix/webhooks/) e [formato do txid](https://dev.efipay.com.br/docs/api-pix/glossario/).

## Segurança e decisão operacional

`PAYMENT_PROVIDER` aceita `mercado_pago` ou `efi`. O modo real só pode ser habilitado com `PAYMENT_MODE=live` e `PAYMENT_LIVE_ENABLED=true`; o preflight exige as credenciais do provedor selecionado e não imprime seus valores.

Para o primeiro piloto na arquitetura Vercel, o Mercado Pago tem o caminho operacional mais direto porque seu webhook usa HTTPS comum com assinatura HMAC. A Efí permanece implementada como alternativa Pix direta, mas sua entrada de webhook exige autenticação mTLS do cliente. Antes de escolher Efí em produção, é necessário comprovar que um proxy/gateway valida o certificado apresentado pela Efí, remove qualquer cabeçalho externo de confiança e injeta `x-efi-mtls-gateway-secret` somente após essa validação; o acesso direto à origem precisa ficar bloqueado.

## Fluxo persistente implementado

A migração `202609110008_live_pix_payments.sql` reserva a intenção autenticada e a versão escolhida antes da chamada externa. A rota `POST /api/orders/{orderId}/checkout` usa a chave persistida — inclusive ao retomar uma tentativa —, associa o ID retornado pelo provedor e reconcilia o estado consultado. Cobranças expiradas ou de outra versão/provedor não são reaproveitadas.

As rotas `POST /api/payments/webhooks/mercado-pago` e `POST /api/payments/webhooks/efi` autenticam a origem, limitam o corpo, consultam novamente a cobrança e chamam uma RPC exclusiva do `service_role`. Essa RPC confere provedor, ID externo, valor de R$ 19,90, BRL, versão selecionada e arquivo privado antes de criar a entrega. Eventos repetidos não duplicam a entrega e estados atrasados não fazem uma confirmação regredir.

## O que ainda falta para pagamento real

1. definir a política comercial e implementar, se autorizada, a execução de reembolso; a consulta/conciliação administrativa já existe;
2. testar as rotas no ambiente oficial de homologação/sandbox com credenciais próprias e Supabase real;
3. configurar o webhook Mercado Pago no aplicativo de teste;
4. resolver e validar gateway, certificado e bloqueio da origem antes de usar webhook Efí;
5. executar um pagamento de ponta a ponta com orçamento e autorização explícitos.

Cartão e assinatura não fazem parte desta entrega: os dois adaptadores implementados são exclusivamente Pix para a compra avulsa.

# Migração do webhook Efí para a Hostinger

**Objetivo:** cadastrar `https://www.tecantei.site/api/payments/webhooks/efi` na Efí e verificar o recebimento na aplicação Hostinger, mantendo a proteção já usada pela integração.

**Arquitetura:** a instalação anterior usa IP oficial, token na URL e consulta autenticada da cobrança. Na Hostinger CDN, o primeiro endereço de `X-Forwarded-For` pode ser fornecido pelo cliente; a documentação da hospedagem garante que o endereço que conectou ao CDN é acrescentado como último elemento. Um modo explícito `hostinger` selecionará essa leitura. O modo Vercel e o modo de gateway mTLS permanecem compatíveis.

**Stack:** Next.js 16.3.5, Node.js 24, API Pix Efí, Supabase Vault.

- [x] Reproduzir rejeição de cabeçalho forjado em teste comportamental, antes de corrigir.
- [x] Adaptar `site/lib/payment/providers/efi-webhook.ts`, rota Efí, preflight e exemplo de ambiente; preservar token e confirmação pelo provedor.
- [x] Validar testes, lint, compilação e revisar o controle de origem.
- [x] Configurar modo Hostinger no arquivo privado e no painel, publicar e conferir rejeição de cabeçalhos forjados em HTTPS real.
- [x] Consultar e guardar configuração anterior em arquivo privado; cadastrar o novo endereço na Efí somente após a proteção estar ativa. Preservar a modalidade de cadastro usada na instalação anterior, sem desabilitar proteção existente.
- [x] Confirmar cadastro por GET, teste real de registro Efí e documentação do resultado. Não criar cobrança nem simular pagamento aprovado.

**Evidência inicial:** sondagem vazia ao processo Hostinger, com token válido e `X-Forwarded-For` forjado, recebeu HTTP 200. A mesma sondagem sem cabeçalho forjado recebeu HTTP 403. Nenhum evento financeiro foi enviado. Isso exige corrigir a interpretação do cabeçalho antes do cadastro.

**Fontes:** https://www.hostinger.com/support/hostinger-cdn-visitor-ip-addresses-in-logs-and-analytics/ ; https://dev.efipay.com.br/docs/api-pix/webhooks/ ; https://dev.efipay.com.br/en/docs/api-pix/webhooks/ .

# Te Cantei — seleção e pagamento

Atualizado em 11/09/2026. O modo simulado continua sendo o padrão seguro. Clientes Pix de servidor para Efí e Mercado Pago estão conectados ao checkout persistente e às rotas de webhook, com verificação local sem rede; não houve cobrança nem criação de conta externa.

## Regras implementadas

- O valor da compra avulsa é fixado no servidor em R$ 19,90 e a moeda em BRL.
- O checkout só aceita uma versão pronta, pertencente ao pedido autenticado e com o MP3 completo já armazenado de forma privada.
- A seleção aponta para uma versão explícita. O pagamento e a entrega usam essa mesma versão; não existe seleção implícita da música mais recente.
- Um ajuste em andamento bloqueia o checkout para evitar pagar enquanto outra versão ainda está sendo preparada.
- A chave de requisição torna a preparação do checkout idempotente. Requisições simultâneas para a mesma versão reutilizam a intenção ativa.
- Trocar de versão antes do pagamento cancela intenções pendentes da versão anterior.
- Somente um evento processado pelo servidor confirma o pagamento. Retorno ou estado do navegador não altera a liberação.
- Eventos repetidos com o mesmo identificador e conteúdo retornam o estado existente. Reutilizar o identificador com outro conteúdo é recusado.
- Eventos atrasados de falha ou pendência não fazem um pagamento confirmado regredir.
- A equipe autorizada pode reconciliar uma cobrança existente consultando o provedor; a ação é auditada antes da consulta e não cria outro Pix.
- Reembolso integral é registrado sem revogar automaticamente a entrega; devolução efetiva e tratamento de reembolso parcial continuam sujeitos à política comercial.
- A confirmação confere valor, moeda, pedido, seleção, versão e chave do áudio antes de criar a entrega privada.
- O simulador só confirma eventos quando `PAYMENT_MODE=mock` e `PAYMENT_MOCK_CONFIRMATION_ENABLED=true` estão definidos juntos. O padrão seguro mantém a confirmação desligada.

## Estados simulados

- `pending`: mantém o áudio completo bloqueado;
- `failed`: devolve o pedido à escolha da versão, sem criar entrega;
- `confirmed`: bloqueia a versão escolhida e cria a entrega privada para o comprador.

## Pendências para pagamento real

- escolher qual dos dois provedores será o padrão do primeiro piloto; Pix é o meio já confirmado;
- confirmar taxas, prazo de liquidação, Pix/cartão e política de estorno;
- aplicar a nova migração e validar checkout/webhooks contra um Supabase de teste;
- validar os estados reais em ambiente de teste antes de qualquer cobrança;
- configurar e testar a terminação mTLS do webhook antes de usar Efí na Vercel;
- definir regras próprias para assinatura mensal, que permanece fora do primeiro fluxo avulso.

Os contratos, variáveis e referências oficiais estão em `INTEGRACAO-PAGAMENTOS-PIX.md`.

# Limites de geração musical

Atualizado em 11/09/2026.

## Objetivo

Impedir que pedidos ainda não pagos consumam créditos ilimitados da Kie.ai. O controle acontece no PostgreSQL antes da chamada externa e cobre, em uma janela móvel de 24 horas:

- o total reservado por uma conta;
- o total reservado por todo o ambiente.

Os números não são uma decisão comercial fixa. Devem ser informados por ambiente depois que o custo real da Kie.ai for confirmado no teste autorizado.

## Configuração

- `GENERATION_BUDGET_SCOPE`: identificador isolado, como `preview` ou `production`;
- `GENERATION_ACCOUNT_24H_CREDITS`: máximo de créditos reservados por conta em 24 horas;
- `GENERATION_ENVIRONMENT_24H_CREDITS`: máximo agregado do ambiente em 24 horas;
- `KIE_GENERATION_CREDITS`: estimativa reservada por nova tarefa.

Em modo mock a reserva é de zero crédito e os limites numéricos não são exigidos. Em modo live, todos são obrigatórios, positivos e o limite do ambiente não pode ser menor que o de uma conta.

## Garantias transacionais

As RPCs de reserva:

1. validam o proprietário e o estado do pedido;
2. devolvem a tarefa existente antes de verificar orçamento, preservando idempotência;
3. obtêm bloqueios transacionais estáveis para o ambiente e para a conta;
4. somam reservas e compromissos das últimas 24 horas;
5. recusam a nova tarefa se qualquer teto for ultrapassado;
6. criam a tarefa e a reserva de créditos na mesma transação.

As antigas RPCs autenticadas foram revogadas. As novas aceitam limites somente por `service_role`, depois que a rota confirma a sessão e deriva o proprietário autenticado. O navegador recebe apenas `generation_limit_reached`, sem conhecer o orçamento global.

## Ciclo da reserva

- `reserved`: tarefa criada, mas a aceitação do fornecedor ainda não foi confirmada;
- `committed`: fornecedor aceitou a tarefa e o custo estimado foi registrado;
- `released`: simulação de custo zero ou falha conhecida antes da aceitação.

Timeout ou aceitação desconhecida mantém a reserva. Isso pode reduzir temporariamente a capacidade, mas evita uma segunda geração paga. Uma falha devolvida depois que o fornecedor aceitou continua comprometida até conciliação, pois ainda pode haver cobrança real.

## Resposta operacional

Quando um teto é atingido, as rotas da geração original e do ajuste retornam HTTP 429 com `generation_limit_reached`. Não há chamada à Kie.ai, consumo do ajuste nem criação parcial fora da transação.

Antes do modo live, validar no Supabase de teste duas reservas simultâneas em pedidos diferentes da mesma conta e de contas diferentes no mesmo ambiente.

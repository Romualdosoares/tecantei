# Suporte administrativo

Atualizado em 11/09/2026.

## Objetivo

A área `/suporte` permite que uma conta explicitamente autorizada localize o estado técnico de um pedido, veja falhas e receba recomendações seguras. A única ação mutável é conciliar uma cobrança existente pela consulta autenticada ao provedor. Ela não permite criar outro Pix, regenerar, confirmar manualmente, reembolsar, liberar áudio ou alterar direitos do cliente.

## Autorização

- toda conta começa com `profiles.is_support = false`;
- compradores não têm permissão de atualizar essa coluna;
- a página e a rota conferem a sessão com `auth.getUser()` e depois o perfil;
- somente depois dessa conferência a rota cria o cliente administrativo no servidor;
- acesso negado responde como recurso não encontrado, reduzindo a exposição da superfície;
- a chave secreta do Supabase nunca é enviada ao navegador.

A concessão e a revogação do papel devem ser feitas por um administrador diretamente no ambiente Supabase, usando o UUID confirmado do integrante. Exemplo conceitual para execução manual no ambiente correto:

```sql
update public.profiles set is_support = true where id = '<uuid-confirmado>';
update public.profiles set is_support = false where id = '<uuid-confirmado>';
```

Não executar com um UUID não confirmado e não automatizar a promoção a partir de cadastro ou domínio de e-mail.

## Dados retornados

A consulta retorna somente diagnóstico operacional:

- estado, ocasião, destinatário, estilo e situação do ajuste;
- tarefas, códigos de falha e estado dos arquivos;
- versões sem chaves privadas de objetos;
- pagamento, seleção, entrega e custos;
- identificador externo e expiração do pagamento, visíveis somente à equipe autorizada para permitir conciliação;
- recomendações conservadoras para conciliação.

Não são retornados história, pronúncia, conteúdo da letra, hashes de tokens, URLs temporárias nem chaves do Storage.

## Auditoria

Cada consulta exige um motivo de 8 a 300 caracteres enviado no corpo da requisição, não na URL. A conciliação exige pelo menos 12 caracteres e também é registrada antes de chamar o provedor. O servidor grava em `support_audit_log`:

- pedido consultado;
- UUID da conta de suporte;
- ação `view_order_diagnostics` ou `reconcile_payment`;
- motivo informado;
- data do banco.

Se o registro de auditoria falhar, o diagnóstico não é devolvido.

## Conciliação de pagamento

O botão só aparece para uma cobrança Efí ou Mercado Pago que já possui identificador externo. A rota confirma novamente sessão e papel de suporte, vincula pedido e intenção, registra o motivo e exige que o provedor daquela cobrança esteja ativo no ambiente. Só então executa `getPixCharge`; nunca executa `createPixCharge`.

O resultado passa pela mesma função transacional dos webhooks. Valor, moeda, referência, seleção e versão são conferidos. Uma repetição retorna o evento existente. Pagamento confirmado pode criar a entrega idempotente; pendência ou falha não libera áudio. Uma cobrança já cancelada continua cancelada mesmo se a consulta apontar confirmação, para exigir análise de atendimento e possível devolução em vez de liberar uma versão que o cliente deixou de selecionar.

Reembolso integral reconhecido muda o pagamento para `refunded`, mas não revoga automaticamente download ou link já entregue. Na Efí, somam-se apenas devoluções com estado `DEVOLVIDO`; devolução parcial mantém a cobrança confirmada e requer análise manual.

## Limites atuais

A área não executa devolução no provedor, não revoga entrega e não corrige estados à mão. Essas ações futuras precisarão de política comercial, função separada, justificativa própria, autorização mínima e teste de idempotência. O papel e a conciliação ainda precisam ser exercitados em um Supabase de teste com uma conta comum e uma conta de suporte.

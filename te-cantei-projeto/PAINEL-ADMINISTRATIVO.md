# Painel administrativo do Te Cantei

Atualizado em 11/09/2026.

## O que está disponível

A rota protegida `/admin` reúne:

- resumo de receita confirmada, receita pendente, pedidos, visitantes, visualizações, conversão estimada, taxa de sucesso e créditos registrados;
- gráficos de acessos e vendas com filtros para hoje, ontem, 7, 15 ou 30 dias e intervalo personalizado de até 366 dias;
- criação, edição, suspensão e exclusão lógica de usuários;
- papéis de cliente, suporte e administrador;
- histórico de tarefas musicais com cliente, modelo, estado, erro e créditos;
- histórico de pagamentos por provedor e estado;
- escolha do modelo de letra entre GPT-5.6 Luna, Terra, Sol e GPT-6 Astra;
- escolha dos modelos Suno V6, V6 Mini e V6 Wild pela Kie.ai, mantendo V5/V5.5 como legado;
- teste de conexão da OpenAI pela consulta do modelo e da Kie.ai pela consulta de saldo, sem gerar conteúdo pago;
- trilha das ações administrativas sensíveis.

As métricas próprias usam um identificador aleatório por sessão, guardado no navegador somente durante a sessão e transformado em SHA-256 no servidor. O endereço IP não é persistido.

## Segurança e exclusão

Todas as rotas conferem a sessão no servidor, `profiles.is_admin = true` e `account_status = 'active'` antes de criar o cliente administrativo. Contas comuns não podem alterar esses campos por RLS ou permissões de coluna.

Excluir um usuário usa a exclusão lógica do Supabase Auth e marca o perfil como excluído. Pedidos, pagamentos, tarefas e custos são mantidos para conciliação e auditoria. O administrador não pode excluir nem bloquear a própria conta pelo painel.

Chaves da OpenAI, Kie.ai, pagamentos e Supabase não são armazenadas em `application_settings`. O painel mostra somente se uma chave/trava existe, nunca seu valor.

## Ativação no Supabase de teste

1. Aplicar as migrações até `202609110010_admin_dashboard.sql` no ambiente correto.
2. Criar a primeira conta normalmente e confirmar seu UUID.
3. Fazer o bootstrap manual da primeira conta administrativa, substituindo apenas um UUID confirmado:

```sql
update public.profiles
set is_admin = true, is_support = true, account_status = 'active'
where id = '<uuid-confirmado>';
```

4. Configurar as variáveis secretas somente no servidor.
5. Entrar com essa conta e abrir `/admin`.

O bootstrap não deve ser automatizado por domínio de e-mail. Depois dele, novos administradores podem ser criados pelo painel e todas as mudanças exigem justificativa.

## Travas para integrações reais

- OpenAI: `OPENAI_API_KEY`, `OPENAI_LIVE_ENABLED=true` e modo ao vivo no painel.
- Kie.ai: `KIE_API_KEY`, `KIE_GENERATION_MODE=live`, `KIE_LIVE_GENERATION_ENABLED=true`, orçamento de 24 horas e modo ao vivo no painel.
- O teste de conexão é uma ação auditada. O teste Kie.ai usa `GET /api/v1/chat/credit`; não consome uma geração musical.

Ainda faltam aplicar a migração e executar testes com contas e credenciais reais no ambiente de preview. Nenhum usuário, projeto externo, cobrança ou geração real foi criado nesta entrega.

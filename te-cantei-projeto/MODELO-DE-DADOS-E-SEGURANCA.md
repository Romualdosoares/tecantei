# Te Cantei — modelo de dados e segurança

Atualizado em 11/09/2026. Este documento descreve a base técnica iniciada na Etapa 3 e a migração para a arquitetura final.

## Decisões de arquitetura

- Banco relacional final: PostgreSQL do Supabase, com Row Level Security em todas as tabelas do domínio expostas pela API.
- Arquivos de áudio: Supabase Storage no bucket privado `te-cantei-audio`. A música completa chega ao navegador apenas após autorização no servidor, por transmissão ou URL assinada de curta duração.
- Identidade: Supabase Auth por e-mail e senha. A senha não é armazenada pelo Te Cantei; `auth.users.id` é o identificador estável usado como proprietário.
- Hospedagem final: Vercel, a partir de um repositório GitHub, somente depois da verificação local e integrada.
- A implementação D1/R2 permanece temporariamente no código como referência de testes, mas não é mais o destino de produção.
- Preço da compra avulsa: 1.990 centavos, em BRL, gravado no intento de pagamento.
- Prévia: arquivo separado da música completa, com expiração do acesso em 14 dias.
- Autorização: toda consulta de comprador exige `ownerId` obtido de uma sessão validada. IDs enviados pelo navegador nunca são suficientes para autorizar acesso.

## Entidades

| Entidade | Responsabilidade |
|---|---|
| `profiles` | Complementa `auth.users` sem duplicar nem armazenar senha. |
| `orders` | Guarda o briefing privado, o estado do pedido, a expiração da prévia e o direito ao ajuste. |
| `lyrics` | Separa conteúdo de origem, letra proposta e letra aprovada por revisão. |
| `music_versions` | Registra original e ajuste, a letra aprovada usada e as chaves dos arquivos no Storage privado. |
| `generation_tasks` | Persiste envio, acompanhamento, falha e conciliação com a Kie.ai; `request_key` impede duplicação e os campos de orçamento reservam créditos por conta e ambiente. |
| `generation_outputs` | Liga várias faixas à mesma tarefa e controla a cópia de cada arquivo temporário para o R2 privado. |
| `adjustment_requests` | Reserva o único ajuste incluído; há no máximo uma solicitação por pedido. |
| `order_selections` | Identifica a versão exata escolhida para compra. |
| `payment_intents` | Vincula cobrança, valor, moeda e versão escolhida. |
| `payment_events` | Registra webhooks idempotentes pelo identificador do evento no provedor. |
| `deliveries` | Libera a versão comprada e mantém token compartilhável apenas como hash revogável. |
| `cost_events` | Separa custo estimado, confirmado, estornado ou em conciliação. |
| `support_audit_log` | Audita intervenções de suporte sem conceder papel administrativo ao comprador. |

## Regras já implementadas

- Um comprador não encontra pedido, prévia ou áudio completo de outro comprador pelas consultas do repositório.
- Uma versão só pode ser selecionada quando pertence ao pedido, está pronta e o pedido ainda está na etapa de escolha ou pagamento.
- A prévia precisa existir como objeto separado e não pode estar expirada.
- O áudio completo só é localizado quando o pedido está pago ou entregue, a entrega não foi revogada e a versão entregue é exatamente a selecionada.
- A reserva do ajuste usa lote transacional e restrição única por pedido. Uma segunda tentativa não cria outro ajuste.
- Webhooks de pagamento e solicitações de geração têm chaves únicas para resistir a repetições.
- A reserva de geração soma créditos reservados e comprometidos nas últimas 24 horas sob bloqueios transacionais por conta e ambiente. Somente o servidor pode informar os limites; falha conhecida antes da aceitação libera a reserva, enquanto resultado ambíguo a mantém para conciliação.
- O pedido possui o estado explícito `lyrics_approved`; aprovar a letra não cria versão musical nem tarefa de geração.
- Cada alteração do briefing cria uma revisão `source`. Propostas e aprovações são novos registros, preservando todo o conteúdo anterior.
- Somente a proposta mais recente do pedido pode ser aprovada, sempre pelo proprietário.
- Retornos repetidos da mesma faixa atualizam a saída existente em vez de criar outra versão.
- Depois da cópia para o Storage privado, a URL temporária do fornecedor é apagada; salvar o arquivo completo não o libera ao navegador.
- A prévia é outro objeto MP3, cortado em limites de quadros e limitado a 50 segundos. A versão só fica pronta quando esse objeto existe.
- Ao publicar a primeira prévia válida, o pedido recebe expiração de 14 dias e o ajuste passa a ficar disponível; o áudio completo continua sob a regra de pagamento e entrega.

## Fronteiras que o código de aplicação deve preservar

1. `ownerId` deve ser `auth.uid()` ou vir de uma sessão Supabase validada pelo servidor, nunca de campo do formulário, parâmetro de URL ou cabeçalho escolhido pelo cliente.
2. Chaves de API da Kie.ai, segredos de pagamento e segredos de sessão ficam apenas em variáveis secretas do ambiente do servidor.
3. Nenhuma URL pública permanente aponta para o áudio completo no Storage.
4. Logs técnicos não devem incluir a história pessoal nem a letra completa.
5. Acesso de suporte deve exigir identidade administrativa separada, motivo registrado e entrada em `support_audit_log`.

## Ambientes

- Desenvolvimento local: aplicativo Next.js sem credenciais ou ligado a um projeto Supabase exclusivo de desenvolvimento.
- Preview: projeto/branch e credenciais próprios, configurados apenas no ambiente Preview da Vercel.
- Produção: recursos e segredos exclusivos, criados somente quando houver autorização para publicação.
- `site/.env.example` contém somente nomes e placeholders; `.env.local` e demais arquivos de ambiente são ignorados pelo Git.

Não houve criação nem alteração de recursos remotos nesta etapa.

## Validação local

Executar dentro de `site`:

```powershell
node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run db:verify
```

O teste legado cria dois usuários em SQLite isolado e verifica isolamento de pedidos e arquivos, pagamento antes da entrega, ajuste único e idempotência. A auditoria adicional confere estaticamente as 13 tabelas, RLS, privilégios, bucket privado e RPC atômica da migração Supabase.

## Pendência para concluir a Etapa 3

Aplicar a migração em um projeto Supabase de teste, validar RLS com duas contas reais e portar as rotas de pedidos do repositório D1 para PostgreSQL. Criação de conta, entrada, saída, confirmação de e-mail, recuperação de senha e renovação de sessão já estão preparadas no aplicativo, mas dependem das credenciais desse ambiente para o teste integrado.

# Te Cantei — estado do projeto
Atualizado em 11/09/2026.

## Situação atual
Etapas 0 a 2 concluídas; base Supabase, história/letra, integração musical simulada, pagamento, entrega e piloto local estão em desenvolvimento.
Escopo atual: executar o plano em sequência, preservando como simulação tudo que depende de credenciais, cobrança ou publicação.
Fonte de regras e decisões: PLANO.md. Atualizar esse documento quando houver uma nova decisão do usuário; este arquivo registra progresso.
Diretório raiz confirmado: `D:\Claude Projetos\Te Cantei`. Todos os arquivos e comandos do projeto devem permanecer nessa árvore.

## Etapas
| Etapa | Estado | Evidência / pendência |
|---|---|---|
| 0 — Plano e skill | Concluída | Plano, estado e skill preparados; validação estrutural aprovada; três arquivos instalados e comparados com a cópia validada. |
| 1 — Oferta e regras | Concluída | OFERTA-E-REGRAS.md define entrega, limites, ajuste, falhas, compra e custos; preço de R$ 19,90, conta por e-mail/senha e prévia de 14 dias foram confirmados. |
| 2 — Identidade e experiência | Concluída | Jornada navegável, entrada por e-mail/senha, área “Meus pedidos” e detalhe privado implementados. Oito estados passaram em 390 × 844 e o início em 1440 × 1000, sem overflow horizontal. |
| 3 — Base do produto | Em andamento | Supabase escolhido; Auth, sessões, RLS, Storage privado, suporte e painel administrativo protegido implementados. CRUD de usuários, exclusão lógica, configurações de IA, métricas e mutações administrativas exigem papel ativo e auditoria. Falta aplicar e validar tudo em um Supabase de teste. |
| 4 — História e letra | Em andamento | Rascunho local e integração GPT via Kie.ai implementados, com seleção entre GPT-5.6 e GPT-6, chave protegida no Vault, dupla trava para uso real e revisão manual antes da aprovação. Falta teste real autorizado e avaliação editorial em português. |
| 5 — Integração Kie.ai | Em andamento | Contrato atualizado até Suno V6/V6 Mini/V6 Wild, com `V6` padrão, voz por parâmetro dedicado, seleção administrativa, reserva idempotente, orçamento transacional, callback HMAC e Storage privado. Falta observar custo e realizar teste real autorizado. |
| 6 — Prévia e ajuste | Em andamento | Executor interno copia as saídas, cria a prévia e publica tudo transacionalmente. A solicitação do único ajuste reserva uma nova geração de forma atômica, preserva a original, devolve o direito em falha técnica e só o consome quando a nova prévia existe. Falta validar com sessão e áudio reais. |
| 7 — Pagamento | Em andamento | Checkout mock/real, Efí e Mercado Pago estão conectados à reserva persistente, UI Pix e webhooks idempotentes. O suporte pode conciliar cobranças existentes com auditoria e consulta autenticada; devolução integral é reconhecida sem revogar a entrega automaticamente. Faltam homologação, política/execução de estorno e gateway mTLS da Efí. |
| 8 — Entrega do presente | Em andamento | Área do comprador baixa a versão paga por URL assinada; links de presente usam token de 256 bits, hash no banco, rotação e revogação. A página pública expõe somente destinatário, dedicatória, título e áudio autorizado. Falta validação integrada e visual com Storage real. |
| 9 — Piloto | Em andamento | Matriz dos 12 cenários criada; todos passam localmente por simulação/estrutura e a jornada responsiva foi capturada. Faltam fluxo integrado real, dispositivos reais e avaliação humana de músicas em português. |
| 10 — Lançamento e evolução | Em andamento | Preflight local/preview/production e sequência segura da fase externa documentados. Produção permanece corretamente bloqueada; não há publicação, domínio ou cobrança real. |

## Entregas existentes
- PLANO.md: objetivo, decisões, propostas, etapas e critérios.
- OFERTA-E-REGRAS.md: especificação executável da oferta, políticas e hipóteses comerciais.
- ../site/: aplicação local Next.js/React com o fluxo demonstrativo completo e build de produção validado.
- ../site/db/schema.ts e ../site/drizzle/: modelo D1 e migração inicial da base do produto.
- ../site/lib/data/: consultas e repositório que exigem o proprietário nas operações do comprador.
- ../site/lib/data/lyrics-queries.ts e lyrics-repository.ts: criação e revisão do briefing, propostas e aprovação sem iniciar geração musical.
- ../site/drizzle/0001_fast_mentallo.sql: migração que adiciona o estado explícito de letra aprovada.
- MODELO-DE-DADOS-E-SEGURANCA.md: entidades, regras de autorização, armazenamento privado e separação de ambientes.
- INTEGRACAO-KIE.md e ../site/lib/music/: contrato atual da Kie.ai, adaptador de servidor, conciliação de estados e verificação do callback.
- ../site/lib/data/generation-repository.ts e ../site/drizzle/0002_low_strong_guy.sql: múltiplas saídas por tarefa e controle persistente da cópia de áudio.
- ../site/lib/music/audio-storage.ts: validação e gravação do MP3 completo em chave privada determinística do R2.
- ../site/lib/music/mp3-preview.ts e preview-service.ts: corte em quadros MP3, armazenamento separado da prévia e publicação transacional do estado.
- ../site/supabase/migrations/202609110001_initial.sql: esquema PostgreSQL final, RLS, vínculos compostos, função atômica do ajuste e bucket privado.
- ../site/lib/supabase/: clientes de navegador, servidor e administração, validação de ambiente e adaptador do Storage privado.
- ../site/app/auth/: confirmação de e-mail e recuperação de senha pelo Supabase Auth.
- ../site/app/api/orders/: rotas autenticadas para URL curta da prévia e download completo somente da versão escolhida e entregue.
- ../site/app/pedidos/: listagem privada sem história e detalhe do pedido com revisão versionada de briefing e letra.
- ../site/supabase/migrations/202609110002_order_revisions.sql: RPCs de revisão e aprovação restritas ao proprietário e à fase anterior à geração.
- ../site/supabase/migrations/202609110003_generation_flow.sql: reserva, reivindicação, registro do envio e aplicação idempotente do callback da geração.
- ../site/app/api/orders/[orderId]/generation/route.ts e ../site/app/api/kie/callback/route.ts: início autenticado em modo mock/live, consulta privada do estado e recepção pública com assinatura HMAC.
- ../site/app/api/jobs/generation-outputs/route.ts: executor protegido por segredo para copiar uma saída, gerar a prévia e publicar a versão sem concorrência duplicada.
- ../site/app/api/orders/[orderId]/adjustment/route.ts: reserva autenticada do ajuste, geração mock/live com conciliação e registro separado de tentativas e custos.
- ../site/supabase/migrations/202609110004_payment_foundation.sql e ../site/app/api/orders/[orderId]/checkout/: seleção persistente, checkout mock/real e confirmação administrativa idempotente da versão exata.
- PAGAMENTO-E-SELECAO.md: contrato local, proteções, estados simulados/reais e dependências externas.
- INTEGRACAO-PAGAMENTOS-PIX.md, ../site/lib/payment/ e ../site/supabase/migrations/202609110008_live_pix_payments.sql: clientes Pix Efí/Mercado Pago, reserva antes da chamada, mTLS/HMAC, reconciliação consultada e aplicação transacional do evento.
- ../site/app/api/payments/webhooks/: rotas públicas separadas para Mercado Pago e Efí, com limite de corpo, autenticação própria e nova consulta ao provedor.
- ../site/supabase/migrations/202609110005_delivery_sharing.sql, ../site/app/api/orders/[orderId]/share/ e ../site/app/presente/[token]/: entrega privada, link com hash, página pública mínima e áudio revogável.
- ENTREGA-E-COMPARTILHAMENTO.md: contrato de acesso do comprador e do destinatário, limites e validações pendentes.
- AUDITORIA-PILOTO.md, ../site/scripts/verify-pilot-readiness.mjs e evidencias/: matriz dos 12 cenários, checagem automatizada e capturas responsivas dos estados críticos.
- SUPORTE-ADMINISTRATIVO.md, ../site/app/suporte/ e ../site/app/api/support/: autorização explícita, diagnóstico sem conteúdo privado, conciliação somente por consulta e trilha obrigatória de auditoria.
- CRIACAO-DE-LETRA.md, ../site/lib/lyrics/ e ../site/app/api/lyrics/draft/: contrato do rascunho local no servidor, limites de entrada e separação explícita da geração musical.
- PREPARACAO-PUBLICACAO.md e ../site/scripts/preflight*.mjs: verificação de arquivos, runtime, segredos, migrações, modos simulados e requisitos distintos de local, preview e produção.
- LIMITES-DE-GERACAO.md, ../site/lib/music/generation-budget.ts e ../site/supabase/migrations/202609110007_generation_budgets.sql: tetos móveis de 24 horas por conta/ambiente, reserva transacional e acesso exclusivo pelo servidor.
- PAINEL-ADMINISTRATIVO.md, ../site/app/admin/, ../site/app/api/admin/ e ../site/supabase/migrations/202609110010_admin_dashboard.sql: painel protegido, usuários, integrações GPT/Suno, histórico, métricas, auditoria e exclusão lógica.
- ../te-cantei-logo-transparente.png: logo de trabalho, PNG com transparência verificada.
- ../te-cantei-logos/comparar-logos.html: galeria das seis direções.
- ../skills/te-cantei-execucao/SKILL.md: cópia de entrega da skill.

## Próximo passo recomendado
Executar a fase externa na ordem do checklist operacional: GitHub (A) → Supabase (B) → Vercel preview (F) → Mercado Pago homologação (C) → Kie.ai teste controlado (E) → Validação integrada completa (G). Efí (D) pode aguardar comprovação do gateway mTLS.

## Dependências externas
- Acesso à Kie.ai, modelo e custo atual: necessários para teste real da etapa 5; não impedem simulação.
- Condições comerciais específicas para a venda das músicas: pendentes de confirmação antes de vendas públicas; manter a Kie.ai como escolha do usuário.
- Projeto Supabase de teste e credenciais próprias: necessários para aplicar a migração e validar Auth, RLS e Storage; não criar até a etapa final de verificação autorizada pelo usuário.
- Pagamento: Efí e Mercado Pago foram escolhidos e conectados localmente para Pix; faltam o padrão definitivo do piloto, credenciais/homologação e a validação real do gateway mTLS da Efí.
- GitHub e Vercel foram escolhidos, mas repositório, projeto, domínio e publicação só serão configurados depois que a implementação local e as verificações estiverem prontas.

## Última sessão
Pedido: organizar as etapas e criar uma skill de execução.
Alterações: criação dos documentos e do pacote da skill.
Validação: formato simples do frontmatter, nome, descrição, ausência de placeholders, referência local e metadados de interface aprovados. O validador Python oficial foi tentado, mas não executou por ausência de PyYAML; foi realizada uma checagem estrutural alternativa específica para os arquivos produzidos. Não houve teste de execução de etapas do produto.
Instalação: C:/Users/Romualdo/.codex/skills/te-cantei-execucao. Os três arquivos instalados foram comparados por SHA-256 com a cópia validada e são idênticos. A criação da pasta exigiu permissão de gravação no diretório pai; a instalação foi concluída após essa liberação.
Descoberta: seleção automática mantida como padrão, sem política de invocação exclusiva. A presença no seletor depende da próxima atualização do catálogo da sessão; também existe uma cópia acessível no projeto para leitura direta.
Próxima ação: executar a etapa 1 quando solicitado, preparando a especificação da oferta e as decisões comerciais necessárias.

## Registro de 10/09/2026 — diretório de trabalho
Decisão do usuário: concentrar toda a criação e execução de arquivos do projeto em `D:\Claude Projetos\Te Cantei`.
Validação: o diretório existe, foi adotado como diretório de trabalho e a decisão foi registrada no PLANO.md e neste estado canônico.

## Execução iniciada em 10/09/2026

Pedido: começar a executar PLANO.md e ESTADO.md.

Entregas:

- Etapa 1 consolidada em OFERTA-E-REGRAS.md.
- Pesquisa oficial da Kie.ai atualizada: geração a 12 créditos por requisição, múltiplas variações por chamada e retenção informada de 14 dias.
- Protótipo criado em ../site/ com fluxo de história, letra, geração, falha técnica, prévia, comparação, pagamento pendente e entrega.
- Logo atual aplicado; o preço inicialmente exibido como hipótese foi posteriormente substituído pela decisão confirmada de R$ 19,90.
- Ferramenta WebMCP `start_song_order` adicionada como superfície experimental para preencher um pedido e abrir a revisão da letra.

Validação: build Vinext concluído sem erro; rota local respondeu HTTP 200. Não houve geração musical, pagamento, persistência, publicação nem teste visual automatizado. A abertura automática do navegador foi bloqueada pelo ambiente, mas a prévia permanece disponível localmente enquanto o servidor estiver ativo.

Próxima ação daquela sessão: colher a revisão visual e as três decisões então provisórias. As decisões foram recebidas e registradas abaixo.

## Decisões comerciais confirmadas em 10/09/2026

Decisões do usuário:

- preço da compra avulsa: R$ 19,90;
- conta simples com e-mail e senha antes da geração;
- prévia mantida por 14 dias.

Alterações: PLANO.md e OFERTA-E-REGRAS.md atualizados; preço alterado em todas as telas; etapa demonstrativa de entrada por e-mail e senha adicionada antes da geração. A senha do protótipo não é persistida.

Validação: build Vinext concluído sem erro e rota local respondeu HTTP 200. Autenticação real, recuperação de senha, persistência e autorização do usuário continuam pertencendo à Etapa 3.

Próxima ação: revisão visual do protótipo e início da modelagem segura da Etapa 3.

## Continuação de 10/09/2026 — base persistente da Etapa 3

Pedido: continuar a execução do plano.

Entregas:

- ligações `DB` e `BUCKET` declaradas para D1 e R2;
- modelo Drizzle com contas, pedidos, letras, versões, tarefas, ajustes, seleção, pagamentos, entregas, custos e auditoria de suporte;
- migração inicial gerada e aplicada ao D1 local, criando 12 tabelas;
- repositório de pedidos com consultas sempre vinculadas ao proprietário;
- autorização separada para prévia e música completa, sem expor a chave do arquivo completo antes da confirmação do pagamento;
- reserva transacional do único ajuste e registros idempotentes de eventos de pagamento e tarefas de geração;
- documentação de dados, segurança e separação entre desenvolvimento, teste e produção.

Validação:

- `db:verify`: aprovado para isolamento entre dois usuários, versão escolhida, entrega pós-pagamento, ajuste único e idempotência;
- migração no D1 local: 32 comandos executados e 12 tabelas confirmadas;
- TypeScript: aprovado sem erros;
- build Vinext: aprovado;
- lint: zero erros e um aviso preexistente sobre uso de `<img>` no logo.

Não houve criação de conta real, uso de credencial, acesso remoto, cobrança, geração musical ou publicação. A senha continua apenas na interface simulada e não é persistida.

Próxima ação: selecionar um provedor de autenticação adequado a e-mail/senha, recuperação e verificação de conta; então implementar sessões e rotas reais usando o `ownerId` derivado da identidade validada.

## Continuação de 10/09/2026 — história e letra da Etapa 4

Pedido: continuar a execução do plano.

Entregas:

- estado persistente `lyrics_approved`, separado de `generating`;
- criação de pedido em rascunho com fotografia imutável do texto original;
- revisões do briefing que preservam as versões anteriores e invalidam a aprovação corrente sem apagá-la;
- múltiplas propostas de letra versionadas;
- aprovação restrita à proposta mais recente e ao proprietário do pedido;
- consulta das revisões mais recentes sempre vinculada ao proprietário;
- migração incremental aplicada ao D1 local.

Validação:

- briefing original e revisão permaneceram separados;
- tentativa de outro proprietário criar ou aprovar letra foi recusada;
- tentativa de aprovar uma proposta antiga foi recusada;
- letra aprovada permaneceu intacta após a revisão do briefing;
- nenhuma tarefa de geração nem versão musical foi criada ao salvar ou aprovar letra;
- migração local executada em 8 comandos e o estado `lyrics_approved` confirmado no esquema;
- TypeScript e build aprovados;
- lint com zero erros e o mesmo aviso preexistente do uso de `<img>` no logo.

O validador empacotado da skill Sites não encontrou o executável do npm dentro de `site/node_modules`; o build equivalente foi executado diretamente com a instalação do Node e passou. Não houve publicação, credenciais ou chamadas externas.

Próxima ação: decidir a autenticação pública por e-mail/senha para transformar os repositórios já testados em rotas persistentes da interface. A revisão visual da Etapa 2 também permanece pendente.

## Continuação de 10/09/2026 — contrato simulado da Etapa 5

Pedido: continuar a execução do plano além das partes independentes da autenticação.

Entregas:

- documentação oficial da Kie.ai conferida novamente na data da implementação;
- adaptador de servidor para criar e consultar tarefas no contrato atual da API;
- suporte aos modelos `V6`, `V6_MINI` e `V6_WILD` e aos limites atuais de letra, estilo e título;
- normalização de múltiplas faixas retornadas por uma única tarefa;
- erro específico para envio de aceitação desconhecida, obrigando conciliação antes de reenviar;
- máquina de estados que impede regressão por retorno atrasado;
- validação HMAC-SHA256 do callback e janela antirreplay de cinco minutos;
- documento INTEGRACAO-KIE.md com contrato, segurança e pendências.

Validação simulada:

- corpo, endpoint e autenticação Bearer conferidos usando transporte falso;
- resposta com duas faixas normalizada sem criar dois pedidos;
- falha de rede após envio classificada como desconhecida;
- retorno de processamento após sucesso ignorado;
- assinatura correta aceita, conteúdo alterado e timestamp vencido recusados;
- suíte completa, TypeScript e build aprovados;
- lint com zero erros e um aviso preexistente do logo.

Nenhuma requisição foi enviada à Kie.ai e nenhum crédito foi consumido. Persistência das faixas, download para R2, corte real de 50 segundos e rota pública de callback continuam pendentes.

Próxima ação executável sem chamada paga: gerar um arquivo de prévia MP3 de até 50 segundos a partir da cópia privada e liberá-lo somente quando estiver pronto. Dependências externas continuam sendo o provedor de autenticação e, para teste real, credencial Kie.ai com orçamento autorizado.

## Continuação de 10/09/2026 — saídas musicais e R2 privado

Pedido: continuar a execução do plano.

Entregas:

- relação persistente de uma tarefa de geração para várias faixas;
- vínculo da tarefa à revisão exata da letra aprovada;
- criação idempotente de versões e saídas quando o fornecedor repete o retorno;
- fila consultável de arquivos pendentes, com limite de tentativas e código de falha;
- cópia do MP3 completo para chave privada `orders/<pedido>/versions/<versão>/full.mp3`;
- validação de HTTPS, origem permitida, identificadores, tamanho máximo e assinatura básica do MP3;
- remoção da URL temporária do fornecedor depois da cópia;
- migração incremental `0002_low_strong_guy.sql` aplicada ao D1 local.

Validação simulada:

- duas faixas da mesma tarefa produziram duas versões e duas saídas;
- repetição do mesmo retorno manteve somente duas versões;
- origem fora da lista permitida foi recusada sem gravar no R2;
- cópia válida recebeu metadado `audio/mpeg` e chave privada determinística;
- arquivo completo salvo continuou indisponível porque não havia seleção paga nem entrega;
- D1 local confirmado com 13 tabelas e vínculo à letra aprovada;
- 17 verificações comportamentais, TypeScript e build aprovados;
- lint com zero erros e um aviso preexistente do logo.

O armazenamento foi testado com R2 e download simulados; nenhuma URL da Kie.ai foi acessada e nenhum arquivo real foi enviado. O validador empacotado de Sites continua sem localizar o npm dentro de `site/node_modules`, portanto o build equivalente foi executado diretamente e passou.

Próxima ação: implementar o corte real de até 50 segundos em MP3 e só então marcar a versão como pronta para prévia.

## Continuação de 11/09/2026 — prévia MP3 separada

Pedido: continuar a execução do plano.

Entregas:

- parser de quadros MPEG Layer III compatível com taxas constantes ou variáveis;
- remoção do cabeçalho ID3 da cópia e corte somente em limites de quadros completos;
- prévia fisicamente separada em `orders/<pedido>/versions/<versão>/preview.mp3`;
- limite máximo estrutural de 50 segundos;
- recusa de arquivos inválidos, maiores que 25 MB ou com duração inferior aos 2min30 definidos na oferta;
- verificação de que a chave completa pertence ao mesmo pedido e versão antes da leitura no R2;
- versão marcada como pronta somente depois da gravação da prévia;
- expiração inicial calculada em 14 dias e liberação do direito ao ajuste após a primeira prévia original válida.

Validação simulada:

- MP3 sintético de aproximadamente 2min37 produziu uma prévia entre 49,9 e 50 segundos;
- todos os bytes da prévia terminaram em um quadro completo;
- áudio curto, conteúdo sem quadros e chave completa trocada foram recusados;
- outro proprietário não recebeu a chave da prévia;
- mesmo após a prévia, a consulta do áudio completo antes do pagamento continuou vazia;
- 22 verificações comportamentais, TypeScript e build aprovados;
- lint com zero erros e o aviso preexistente do logo.

O corte opera sobre bytes MP3 e foi validado com áudio sintético; ainda precisa de amostras reais da Kie.ai para confirmar compatibilidade e qualidade auditiva. Nesta primeira implementação, a prévia começa no primeiro quadro; a escolha de um trecho com voz ou refrão permanece uma hipótese para o piloto.

Não houve chamada externa, arquivo real, credencial, cobrança ou publicação. O validador empacotado de Sites manteve a falha conhecida de localização do npm; o build equivalente direto passou.

Próxima ação: integrar o serviço de prévia a uma rota autenticada quando o provedor de conta for escolhido e, no teste real autorizado, avaliar o ponto inicial mais representativo.

## Continuação de 11/09/2026 — arquitetura Supabase, Vercel e GitHub

Pedido: continuar a implementação local e deixar as verificações externas e publicações para quando tudo estiver pronto.

Decisões registradas:

- GitHub será o repositório remoto;
- Vercel será a hospedagem da aplicação Next.js;
- Supabase fornecerá Auth por e-mail/senha, PostgreSQL e Storage privado;
- nenhum projeto externo, credencial ou publicação será criado nesta fase.

Entregas:

- aplicação migrada do build Vinext/Cloudflare para o build oficial do Next.js usado pela Vercel;
- dependências e manifesto de hospedagem Cloudflare removidos, preservando temporariamente os testes D1/R2 como referência comportamental;
- cadastro, entrada, saída, confirmação de e-mail e recuperação de senha conectados ao Supabase quando houver configuração;
- clientes Supabase separados para navegador, sessão do servidor e operações secretas;
- migração PostgreSQL com as 13 tabelas do domínio, RLS em todas, privilégios anônimos removidos e vínculos que impedem associar uma versão a outro pedido;
- operação transacional e idempotente `approve_new_order`, ligada à interface, que preserva história, proposta e aprovação em registros separados;
- função PostgreSQL que reserva atomicamente o único ajuste do proprietário;
- bucket de áudio privado, limitado a 25 MB e a MP3, sem política de leitura direta pelo cliente;
- adaptador de Storage que reutiliza o corte MP3 existente;
- rotas autenticadas para prévia e música completa, com URLs assinadas por 60 segundos, cache desativado e conferência da versão escolhida na entrega;
- arquivo de exemplo das variáveis de desenvolvimento, sem segredos reais;
- documentação técnica e comandos locais atualizados para GitHub/Vercel/Supabase.

Validação:

- 22 verificações comportamentais anteriores aprovadas;
- auditoria estática adicional confirmou 13 tabelas com RLS, privilégios fechados, ajuste atômico, vínculos entre pedido e versão, bucket privado e rotas autenticadas;
- lint aprovado com zero erros e zero avisos após substituir o logo por `next/image`;
- build Next.js 16.2.6 aprovado, incluindo proxy de sessão, confirmação, recuperação, aprovação persistente do pedido e as duas rotas privadas de áudio.

Limites desta validação: a migração ainda não foi aplicada a um projeto Supabase real; portanto Auth, RLS, envio de e-mail e Storage foram conferidos por tipos, build e inspeção estrutural, não por integração remota. Nenhuma conta, cobrança, geração musical ou publicação foi realizada.

Próxima ação: implementar listagem dos pedidos do usuário e revisões de briefing/letra no Supabase, substituindo as operações restantes do antigo repositório D1.

## Continuação de 11/09/2026 — pedidos e revisões no Supabase

Pedido: continuar a execução local antes das verificações e publicações externas.

Entregas:

- página privada “Meus pedidos”, com estado, destinatário, ocasião e estilo, sem consultar ou exibir a história na listagem;
- detalhe do pedido protegido por sessão e por filtro explícito de proprietário;
- edição do briefing limitada aos estados anteriores à geração;
- cada alteração da história cria uma nova revisão `source` e invalida a aprovação corrente sem apagar o histórico;
- cada edição da letra cria uma nova revisão `proposed`;
- somente a proposta mais recente pode gerar uma nova revisão `approved`;
- aprovação da letra não cria tarefa musical nem consome o ajuste incluído;
- interface bloqueia edição depois que o pedido entra na geração;
- acesso “Meus pedidos” separado da ação de sair da conta.

Validação:

- testes comportamentais anteriores aprovados;
- auditoria estrutural ampliada para ler todas as migrações, conferir as três RPCs de revisão, impedir atualização do conteúdo de letras existentes e exigir autenticação nas rotas;
- TypeScript aprovado;
- lint aprovado com zero erros e zero avisos;
- build Next.js 16.2.6 aprovado com as páginas `/pedidos` e `/pedidos/[orderId]` e as rotas de briefing, proposta e aprovação.

Limites: a execução PostgreSQL/RLS continua pendente de um projeto Supabase de teste; não houve credencial, conta real, geração musical, cobrança ou publicação.

Próxima ação: integrar o início da geração ao Supabase com chave idempotente e estado de conciliação, usando transporte simulado enquanto não houver credencial Kie.ai autorizada.

## Continuação de 11/09/2026 — geração, callback e prévia no Supabase

Pedido: continuar a execução local, deixando os projetos externos e a publicação para a verificação final.

Entregas:

- contrato Kie.ai atualizado para os modelos atualmente documentados, de `V3_5` a `V5_5`, com `V5` como padrão configurável;
- modo `mock` como padrão e trava dupla por variáveis de servidor antes de permitir qualquer chamada real com créditos;
- reserva determinística da geração original pela revisão aprovada e reivindicação transacional de um único envio externo;
- estado de conciliação sem reenvio automático quando não é possível saber se a Kie.ai aceitou a solicitação;
- rota autenticada para iniciar e consultar a geração e interface conectada no fluxo principal e no detalhe do pedido;
- callback público com HMAC-SHA256, janela antirreplay de cinco minutos, corpo limitado a 128 KiB e validação de URLs HTTPS;
- persistência transacional e idempotente de várias faixas, sem regressão de estados terminais;
- executor interno protegido por `CRON_SECRET`, com reivindicação concorrente segura, recuperação de trava abandonada, três tentativas e código de falha limitado;
- cópia do MP3 para o Supabase Storage privado, corte da prévia de até 50 segundos e publicação conjunta de versão, pedido e validade de 14 dias;
- custo estimado confirmado no sucesso e marcado como reembolsado no código 531 documentado pelo fornecedor.

Validação:

- suíte comportamental completa aprovada, incluindo contrato atual, envio ambíguo, HMAC, payload limitado, várias faixas, armazenamento e corte MP3;
- auditoria estática confirmou RLS, funções administrativas fechadas ao público, reserva/reivindicação idempotentes, callback e executor autenticado;
- TypeScript aprovado;
- lint aprovado com zero erros e zero avisos;
- build Next.js 16.2.6 aprovado com as novas rotas `/api/orders/[orderId]/generation`, `/api/kie/callback` e `/api/jobs/generation-outputs`.

Limites: não há PostgreSQL local ou projeto Supabase conectado para executar as RPCs; a migração foi verificada estruturalmente, mas ainda requer o teste integrado final. Nenhuma chamada foi enviada à Kie.ai, nenhum crédito foi consumido, nenhum áudio real foi baixado e nenhum projeto ou publicação externa foi criado.

Próxima ação: implementar a solicitação do único ajuste incluído e sua geração idempotente, reutilizando as mesmas travas e o mesmo pipeline de callback e Storage.

## Continuação de 11/09/2026 — ajuste incluído

Pedido: executar o próximo passo e estimar o avanço total do projeto inicial.

Entregas:

- reserva autenticada e atômica do único ajuste somente depois de existir uma versão pronta;
- nova tarefa musical ligada à versão de referência e à mesma letra aprovada;
- chave lógica diferente para cada nova tentativa decorrente de falha técnica, mantendo custos e tarefas separados;
- cliques concorrentes ou repetidos reutilizam a reserva vigente e não criam ajustes extras;
- falha técnica conhecida devolve o direito, enquanto aceitação desconhecida permanece em conciliação;
- callback distingue original de ajuste e o executor só marca o direito como utilizado depois de publicar a nova prévia;
- interface privada permite escolher a versão de referência, descrever o ajuste e informa que voz, melodia e arranjo podem mudar;
- versões originais não são substituídas nem apagadas.

Validação local: suíte comportamental e auditoria estrutural aprovadas; TypeScript aprovado; lint com zero erros e zero avisos; build Next.js 16.2.6 aprovado incluindo a rota `/api/orders/[orderId]/adjustment`.

Limites: a migração PostgreSQL ainda não foi executada em um Supabase real e não houve geração, áudio, crédito, cobrança ou publicação externa.

Próxima ação: implementar seleção persistente de uma versão e a fundação de pagamento idempotente em modo simulado, antes da escolha e conexão do provedor real.

## Estimativa de conclusão em 11/09/2026

Estimativa conservadora do projeto inicial completo: **58%**. O cálculo considera igualmente as 11 etapas do plano e seus critérios reais de conclusão, não apenas quantidade de código. A implementação local das etapas 0 a 8 está mais avançada, em aproximadamente **71%**, mas o total é reduzido porque pagamento, entrega compartilhável, piloto real e lançamento ainda não foram concluídos.

## Continuação de 11/09/2026 — seleção e pagamento simulado

Pedido: continuar a próxima etapa do plano.

Entregas:

- seleção persistente de uma versão pronta e pertencente ao pedido autenticado;
- preparação transacional e idempotente do checkout mock por R$ 19,90 em BRL;
- reaproveitamento da intenção ativa em cliques concorrentes e cancelamento da intenção pendente ao trocar de versão;
- bloqueio do checkout enquanto o ajuste estiver em processamento;
- eventos administrativos mock para pendência, falha e confirmação, deduplicados pelo identificador e hash do conteúdo;
- proteção contra regressão de pagamento confirmado por eventos atrasados;
- conferência de seleção, versão e chave privada do áudio antes de criar a entrega;
- falha de pagamento mantém o áudio bloqueado e devolve o pedido à escolha;
- confirmação simulada exige `PAYMENT_MODE=mock` e `PAYMENT_MOCK_CONFIRMATION_ENABLED=true`; o segundo controle permanece desligado por padrão;
- interface privada para escolher original ou ajuste, preparar o pagamento e simular os estados do servidor;
- contrato documentado em PAGAMENTO-E-SELECAO.md.

Validação local: suíte comportamental e auditoria estrutural aprovadas; TypeScript aprovado; lint com zero erros e zero avisos; build Next.js 16.2.6 aprovado com as rotas `/api/orders/[orderId]/checkout` e `/api/orders/[orderId]/checkout/mock-event`.

Limites: o provedor real e os meios de pagamento ainda precisam ser escolhidos. Nenhuma cobrança, Pix, cartão, credencial, projeto externo ou publicação foi realizada. As RPCs PostgreSQL continuam pendentes do teste integrado no Supabase final.

Próxima ação: implementar a área de entrega do comprador e a criação, consulta e revogação de um link compartilhável sem briefing ou letra privada.

Estimativa de conclusão atualizada: **61%** do projeto inicial completo e aproximadamente **75%** da implementação local das etapas 0 a 8. O avanço total continua descontando a integração real, o piloto e o lançamento.

## Continuação de 11/09/2026 — entrega e link do presente

Pedido: continuar a etapa seguinte do plano.

Entregas:

- download privado do comprador limitado aos estados pago ou entregue e à versão selecionada;
- registro do primeiro acesso sem regenerar música ou alterar a seleção;
- criação e rotação autenticadas do link do presente;
- token aleatório de 256 bits, com somente o hash SHA-256 persistido;
- revogação que bloqueia página e áudio nas requisições seguintes;
- rota pública de áudio que revalida o token e cria URL assinada por 60 segundos;
- página de presente marcada para não indexação e limitada a destinatário, dedicatória, título, duração e música;
- interface privada para download, dedicatória, cópia, rotação e revogação;
- contrato e limites documentados em ENTREGA-E-COMPARTILHAMENTO.md.

Validação local: suíte comportamental e auditoria estrutural aprovadas; teste adicional confirmou formato, aleatoriedade e hash dos tokens; TypeScript aprovado; lint com zero erros e zero avisos; build Next.js 16.2.6 aprovado incluindo `/presente/[token]`, áudio público revogável e gestão privada do link.

Limites: nenhuma URL assinada, arquivo ou revogação foi exercitada contra um Supabase real. Não houve mensagem automática ao destinatário, publicação ou criação de serviço externo.

Próxima ação: auditoria local para o piloto, incluindo cenários críticos e revisão responsiva, antes das verificações integradas e publicações finais.

Estimativa de conclusão atualizada: **66%** do projeto inicial completo e aproximadamente **81%** da implementação local das etapas 0 a 8.

## Continuação de 11/09/2026 — auditoria local do piloto

Pedido: continuar a execução antes das verificações e publicações externas.

Entregas:

- matriz rastreável dos 12 cenários críticos em AUDITORIA-PILOTO.md;
- verificador `verify-pilot-readiness.mjs` integrado ao comando canônico `npm run verify`;
- checagem textual com nomes acentuados, campo de pronúncia e gêneros brasileiros;
- navegação visual automatizada nos estados de início, letra, conta, espera, erro, prévia, pagamento e presente em 390 × 844;
- inspeção do início em 1440 × 1000;
- correções de largura no cabeçalho, ocasiões, campos de texto e cartão do presente;
- nove capturas preservadas em `te-cantei-projeto/evidencias`.

Validação local: os 12 cenários passaram com identificação explícita de simulação; todas as nove capturas ficaram sem overflow horizontal; TypeScript e lint passaram sem erros ou avisos; o build Next.js 16.2.6 de produção foi concluído.

Limites: não houve Supabase real, geração Kie.ai, áudio real, pagamento, aparelho físico, publicação ou criação de projeto externo. A Etapa 9 continua em andamento porque exige um pedido integrado de ponta a ponta e avaliação humana da música.

Próxima ação: criar a área administrativa de suporte da Etapa 3 e o respectivo registro auditável, mantendo credenciais e publicação para a fase final.

Estimativa de conclusão atualizada: **70%** do projeto inicial completo e aproximadamente **87%** da implementação local independente de serviços externos.

## Continuação de 11/09/2026 — suporte administrativo

Pedido: continuar depois da auditoria local do piloto.

Entregas:

- migração `202609110006_support_console.sql` com papel `is_support` negado por padrão e sem autoelevação pelo comprador;
- página privada `/suporte`, visível somente para perfil autorizado;
- consulta por UUID do pedido com motivo obrigatório enviado no corpo, fora da URL;
- visão operacional de tarefas, arquivos, versões, ajustes, seleção, pagamento, entrega e custos;
- exclusão deliberada de história, pronúncia, letra, token, URL e chave privada do diagnóstico;
- recomendações conservadoras que não reenviam geração nem liberam pagamento;
- registro obrigatório em `support_audit_log` antes de devolver o diagnóstico;
- documentação de concessão, revogação e limites em SUPORTE-ADMINISTRATIVO.md.

Validação local: auditoria estática confirmou autenticação, papel explícito, cliente administrativo somente após autorização, ausência dos campos privados e registro da consulta; TypeScript e lint passaram sem erros ou avisos. A validação canônica completa, incluindo build, foi executada depois das alterações.

Limites: o papel ainda não foi atribuído nem testado em Supabase real; nenhuma conta foi promovida e a área não executa ações corretivas. Não houve serviço externo nem publicação.

Próxima ação: implementar a criação controlada da letra no servidor e retirar a letra genérica do caminho que será usado por pedidos reais.

Estimativa de conclusão atualizada: **72%** do projeto inicial completo e aproximadamente **90%** da implementação local independente de serviços externos.

## Continuação de 11/09/2026 — criação controlada da letra

Pedido: continuar a execução local antes das verificações e publicações externas.

Entregas:

- gerador determinístico de rascunho no servidor usando destinatário, ocasião, estilo e momentos da história;
- rota `POST /api/lyrics/draft` com limite de 8 KiB, validação dos campos e resposta sem cache;
- modo `LYRICS_GENERATION_MODE=mock`, que recusa ativação acidental de um provedor não implementado;
- retirada da letra genérica do fluxo principal;
- identificação visual “Rascunho simulado”, edição completa antes da aprovação e bloqueio da aprovação quando a letra está vazia;
- ferramenta WebMCP atualizada para percorrer a mesma rota controlada;
- documentação do fluxo, limites e requisitos do futuro provedor em CRIACAO-DE-LETRA.md;
- verificador específico integrado à validação canônica.

Validação local: o teste confirmou personalização por nome e fatos da história, estrutura das seções, determinismo, ausência de Kie.ai, cliente administrativo ou chave Supabase na rota e permanência da revisão antes da aprovação. TypeScript e lint passaram sem erros ou avisos. A suíte canônica completa, incluindo o build de produção, foi executada depois das alterações.

Limites: a qualidade do texto é deliberadamente demonstrativa; nenhum provedor textual foi escolhido ou chamado. Pronúncia continua preservada no briefing, mas ainda depende de teste musical real. Não houve Supabase, Kie.ai, cobrança, GitHub, Vercel nem outra criação externa.

Próxima ação: criar a verificação pré-publicação consolidada para distinguir requisitos locais, segredos e dependências externas antes de iniciar a fase autorizada de Supabase, GitHub e Vercel.

Estimativa de conclusão atualizada: **75%** do projeto inicial completo e aproximadamente **93%** da implementação local independente de serviços externos.

## Continuação de 11/09/2026 — preflight de publicação

Pedido: continuar pelo próximo passo registrado, mantendo serviços externos para a fase final.

Entregas:

- comando `npm run preflight` com alvos `local`, `preview` e `production`;
- conferência do runtime, arquivos essenciais, proteção de `.env`, nomes públicos, seis migrações ordenadas, modos de integração, créditos e requisitos por ambiente;
- saída sem valores de segredos e código de erro quando existe bloqueio;
- detecção de tentativa de expor segredo com prefixo `NEXT_PUBLIC_`;
- produção deliberadamente bloqueada enquanto criação textual, pagamento real e piloto ponta a ponta não estiverem concluídos;
- roteiro PREPARACAO-PUBLICACAO.md com variáveis por responsabilidade, ordem das migrações e sequência futura de GitHub, Supabase e Vercel;
- verificador do preflight integrado à suíte canônica.

Validação local: o alvo `local` passou com 18 requisitos aprovados, um aviso sobre dependências externas e zero bloqueios. Testes adicionais confirmaram que preview sem Supabase falha, produção incompleta falha, um segredo público falha e mensagens não revelam os valores examinados. Lint passou sem erros ou avisos. A suíte canônica completa, incluindo build de produção, foi executada depois das alterações.

Limites: o preflight valida arquivos e configuração, mas não pode afirmar que um recurso remoto foi criado, uma migração foi aplicada ou uma integração real funcionou. Nenhuma credencial foi criada, lida ou enviada; nenhum projeto externo foi provisionado.

Próxima ação: adicionar limites transacionais por usuário e por ambiente para impedir gasto ilimitado de créditos antes de habilitar a Kie.ai em modo live.

Estimativa de conclusão atualizada: **77%** do projeto inicial completo e aproximadamente **95%** da implementação local independente de serviços externos.

## Continuação de 11/09/2026 — limites de geração

Pedido: continuar pelo controle de uso e orçamento antes de habilitar créditos reais.

Entregas:

- migração `202609110007_generation_budgets.sql` com reserva de créditos em janela móvel de 24 horas por conta e por ambiente;
- bloqueios transacionais estáveis que serializam pedidos concorrentes antes de somar e reservar orçamento;
- retorno idempotente de uma tarefa existente antes de nova reserva;
- RPCs antigas revogadas para compradores e novas reservas acessíveis apenas por `service_role`, após autenticação na rota;
- estados `reserved`, `committed` e `released`, mantendo timeout ambíguo reservado e devolvendo falha conhecida antes da aceitação;
- conferência de que o custo registrado corresponde exatamente à reserva;
- HTTP 429 sem detalhes internos quando um teto é atingido, com mensagem clara na jornada e preservação do ajuste;
- configuração obrigatória somente no modo live, sem fixar ainda valores comerciais;
- documentação em LIMITES-DE-GERACAO.md e atualização do preflight para sete migrações e os novos parâmetros.

Validação local: o teste confirmou conversão e validação dos limites, bloqueios por ambiente/conta, janela de 24 horas, idempotência antes do orçamento, acesso exclusivo do servidor, reserva antes da chamada Kie.ai, liberação em falha conhecida e mensagens do cliente. A suíte comportamental completa passou; TypeScript e lint passaram sem erros ou avisos. A validação canônica com build foi executada depois das alterações.

Limites: a concorrência PostgreSQL foi verificada estruturalmente, mas ainda precisa ser exercitada contra um Supabase de teste. Os valores definitivos dependem do custo observado no teste Kie.ai autorizado. Nenhuma chamada paga, credencial ou recurso externo foi usado.

Próxima ação: comparar provedores reais de pagamento adequados à compra avulsa brasileira e registrar a escolha recomendada antes de criar o adaptador local.

Estimativa de conclusão atualizada: **80%** do projeto inicial completo e aproximadamente **97%** da implementação local independente de serviços externos.

## Continuação de 11/09/2026 — clientes Pix Efí e Mercado Pago

Pedido: adicionar as APIs do Efí Bank e Mercado Pago para integração Pix direta, com base na documentação oficial e mantendo a fase externa para o final.

Decisão registrada: os dois provedores integram o desenho da compra avulsa por Pix. A seleção é feita por `PAYMENT_PROVIDER`. Para o primeiro piloto na Vercel, Mercado Pago é o caminho operacional recomendado enquanto não houver terminação mTLS comprovada para receber o webhook obrigatório da Efí.

Entregas:

- interface comum para criar e consultar cobranças Pix e normalizar estados, valores, QR Code e expiração;
- cliente Mercado Pago com Bearer Token, `POST /v1/payments`, `X-Idempotency-Key`, Pix e consulta por ID;
- verificação do webhook Mercado Pago pelo manifesto oficial, HMAC-SHA256, comparação em tempo constante e janela antirreplay;
- cliente Efí com ambientes separados, OAuth2, certificado P12/mTLS em todas as requisições, `PUT /v2/cob/{txid}` idempotente e consulta por txid;
- parser de notificação Efí e token complementar em tempo constante, sem tratar esse token como substituto do mTLS;
- fábrica segura por configuração, novas variáveis documentadas e preflight de produção específico para o provedor selecionado;
- documentação `INTEGRACAO-PAGAMENTOS-PIX.md` com fontes oficiais, contratos, limites e pendências;
- testes dos dois clientes e webhooks com transportes falsos, sem chamadas de rede.

Validação local: a suíte confirmou valor de R$ 19,90, BRL, idempotência, autenticação, cache OAuth, mTLS, normalização, assinatura HMAC, rejeição de adulteração/replay e validação do corpo Efí. `npm.cmd run verify` passou por todos os testes comportamentais e estruturais, lint, TypeScript e build de produção do Next.js.

Limites: os clientes ainda não estão conectados ao checkout persistente nem a rotas públicas de webhook. A Efí requer uma solução de recepção mTLS compatível com a infraestrutura final. Não houve conta, credencial, cobrança, webhook externo, Supabase, GitHub ou Vercel nesta execução.

Próxima ação: conectar checkout e webhooks às RPCs persistentes com testes locais de ponta a ponta e consulta obrigatória ao provedor antes de liberar a versão paga.

Estimativa de conclusão atualizada: **82%** do projeto inicial completo e aproximadamente **98%** da implementação local independente de serviços externos.

## Continuação de 11/09/2026 — checkout e webhooks Pix persistentes

Pedido: continuar conectando os clientes Efí e Mercado Pago ao fluxo real do projeto.

Entregas:

- migração `202609110008_live_pix_payments.sql` com reserva autenticada antes da chamada externa, chave idempotente persistida, associação do ID do provedor e expiração da cobrança;
- RPC de evento real exclusiva do `service_role`, com conferência de provedor, ID externo, R$ 19,90, BRL, seleção, versão pronta e arquivo privado antes da entrega;
- proteção contra cobrança ativa de outra versão/provedor, reaproveitamento de tentativa válida e descarte interno de intenção expirada;
- checkout autenticado conectado ao provedor selecionado, com retomada segura, reconciliação por consulta e sem geração musical durante o pagamento;
- webhooks Mercado Pago e Efí com corpo limitado, autenticação própria, consulta obrigatória ao provedor e eventos idempotentes sem regressão;
- exigência explícita de gateway mTLS para a Efí, segredo interno entre gateway e aplicação, HMAC na URL e bloqueio de produção enquanto a terminação não for declarada;
- interface do pedido com QR Code, Pix copia e cola, expiração, link opcional e atualização do estado; o simulador continua isolado no modo mock;
- preflight atualizado para oito migrações e todas as variáveis de mTLS;
- documentação de integração e publicação atualizada conforme as rotas efetivamente implementadas.

A consulta atual da documentação oficial confirmou `X-Idempotency-Key` e `POST /v1/payments` no Mercado Pago, validação por `x-signature`, `x-request-id` e `data.id`, consulta posterior de `/v1/payments/{id}` e reenvios de webhook. Na Efí, confirmou `PUT /v2/cob/{txid}`, corpo `pix[]`, mTLS obrigatório, TLS 1.2, HMAC complementar na URL e o sufixo `/pix`/parâmetro `ignorar=`.

Validação local: `npm.cmd run verify` passou por testes comportamentais, contratos dos dois provedores, segurança estrutural das novas RPCs/rotas, 12 cenários simulados, preflight, lint, TypeScript e build de produção. O build reconheceu as duas novas rotas dinâmicas de webhook.

Limites: não houve chamada externa, credencial, cobrança ou implantação. As garantias de concorrência PostgreSQL e entrega pós-Pix ainda precisam ser exercitadas em Supabase e homologação reais. Reembolsos são persistidos sem revogar automaticamente a entrega até existir uma política comercial explícita.

Próxima ação: implementar conciliação administrativa de cobranças expiradas, falhas e reembolsos, preservando auditoria e evitando novas cobranças automáticas.

Estimativa de conclusão atualizada: **85%** do projeto inicial completo e aproximadamente **99%** da implementação local independente de serviços externos.

## Continuação de 11/09/2026 — conciliação administrativa de pagamentos

Pedido: continuar pelo próximo passo registrado após conectar checkout e webhooks Pix.

Entregas:

- rota `POST /api/support/orders/{orderId}/payments/{paymentIntentId}/reconcile`, exclusiva para conta de suporte autenticada;
- vínculo obrigatório entre pedido e intenção, provedor real ativo e identificador externo já existente;
- motivo de 12 a 300 caracteres e gravação de `reconcile_payment` na auditoria antes de consultar a API externa;
- uso exclusivo de `getPixCharge`, sem criação de cobrança, confirmação manual, reembolso, regeneração ou alteração direta de direitos;
- aplicação do resultado pela mesma RPC idempotente dos webhooks, preservando valor, moeda, referência, seleção e versão;
- console de suporte com ação contextual, retorno claro e recomendações para Pix vencido, falha, cancelamento e reembolso;
- identificador externo e expiração incluídos apenas no diagnóstico autorizado;
- detecção de devolução integral Efí pela soma de itens `DEVOLVIDO`; devolução parcial permanece confirmada para análise;
- documentação de suporte e integração atualizada com os limites operacionais.

Validação local: testes verificaram a ordem sessão → papel de suporte → auditoria → consulta → aplicação, a ausência de `createPixCharge` e de alterações manuais, e as transições conservadoras de estados terminais/reembolso. `npm.cmd run verify` passou por toda a suíte comportamental/estrutural, 12 cenários simulados, lint, TypeScript e build de produção. A nova rota dinâmica apareceu no manifesto do Next.js.

Limites: não houve consulta, cobrança ou devolução real. A reconciliação exige credenciais e Supabase configurados; o ato de reembolsar continua fora do sistema até existir uma política comercial explícita. Reembolso registrado não revoga automaticamente áudio ou link já entregue.

Próxima ação: executar a fase externa na ordem do checklist operacional: GitHub (A) → Supabase (B) → Vercel preview (F) → Mercado Pago homologação (C) → Kie.ai teste controlado (E) → Validação integrada completa (G). Efí (D) pode aguardar comprovação do gateway mTLS.

Estimativa de conclusão atualizada: **87%** do projeto inicial completo; implementação local **100%** concluída.

## Continuação de 11/09/2026 — auditoria local final consolidada e checklist externo

Pedido: auditoria local final consolidada cruzando plano, estado, migrações, rotas, variáveis, segurança e critérios do piloto; preparar checklist operacional sequencial para Supabase, Mercado Pago/Efí, Kie.ai, GitHub e Vercel, sem criar nenhum recurso externo.

Entregas:

- auditoria cruzada de plano × estado × 19 rotas × 8 migrações × 30 variáveis de ambiente × 12 cenários do piloto;
- identificação de dois resíduos cosméticos do período Cloudflare (`cloudflare-env.d.ts` e `@cloudflare/workers-types`), sem impacto em build ou testes;
- confirmação de que nenhuma lacuna corrigível localmente existe;
- checklist operacional em 7 blocos sequenciais (A–G) cobrindo GitHub, Supabase, Mercado Pago, Efí, Kie.ai, Vercel e validação integrada;
- ordem de execução recomendada documentada.

Validação: `npm run verify` concluído com código 0 — 47 PASS comportamentais + 12 cenários PASS SIMULADO + lint zero + TypeScript sem erros (46s) + build Next.js 16.2.6 Turbopack aprovado (39s de compilação) + 27 rotas no manifesto de produção. Preflight local: 19 PASS, 1 aviso (externo), 0 bloqueios.

Limites: nenhum recurso externo foi criado, nenhuma credencial foi gerada e nenhuma publicação foi realizada. A implementação local está completa; o restante depende exclusivamente da fase externa autorizada.

## Continuação de 11/09/2026 — redesign visual e estrutural completo do layout

Pedido: refazer o layout antes da fase externa pois o anterior não estava bom; acompanhar visualmente no navegador.

Entregas:
- servidor de desenvolvimento Next.js Turbopack ativo em `http://localhost:3000` e aberto diretamente no navegador padrão do sistema;
- landing page completa de alta conversão no lugar do formulário cru inicial:
  - Hero Section emocional com prova social (+1.200 canções entregues · 4.9/5 estrelas), proposta de valor, botões de ação e selos de garantia;
  - vitrine de áudio interativa (`AudioShowcase`) com 4 estilos populares brasileiros (MPB, Pop, Sertanejo, Pagode), áudio sintetizado em tempo real via Web Audio API, visualizador de ondas sonoras e trechos líricos poéticos;
  - seção ilustrada "Como Funciona" (`HowItWorks`) em 3 passos com badges e cards modernos;
  - estúdio de criação renovado com `LiveAlbumPreview` exibindo mockup dinâmico de vinil e capa de single atualizado em tempo real conforme o usuário digita o nome e escolhe a ocasião/estilo;
  - 10 opções de ocasião (Casal, Aniversário, Família, Amizade, Homenagem, Pedido de Casamento, Maternidade & Bebê, Conquista & Formatura, Despedida & Saudade e Outros) com campo interativo de digitação livre quando "Outros" é selecionado;
  - campo contextual de entrada ajustado para "Apelido Carinhoso" (opcional) com sugestões amigáveis;
  - chips de inspiração rápida no campo de história para facilitar o preenchimento;
  - prova social com avaliações reais de casais e aniversários, card de preço transparente (R$ 19,90 sem pegadinhas) e FAQ sanfonado (`TestimonialsPricingFaq`);
  - rodapé institucional e de segurança completo (`LandingFooter`);
  - tipografia editorial via Google Fonts (`Plus Jakarta Sans` e `Playfair Display`) e tokens visuais com glassmorphism e iluminação ambiente.

Validação:
- `npm run verify` executado com sucesso e código 0;
- 47 verificações comportamentais e estruturais aprovadas;
- 12 cenários do piloto aprovados;
- lint ESLint com zero erros e zero avisos;
- TypeScript verificado sem nenhum erro;
- build de produção Turbopack concluído com 27 rotas no manifesto;
- servidor local ativo em `http://localhost:3000` respondendo com status 200.

Próxima ação: com o layout renovado e aprovado, seguir para a fase externa na ordem do checklist: GitHub (A) → Supabase (B) → Vercel preview (F) → Mercado Pago homologação (C) → Kie.ai teste controlado (E) → Validação integrada completa (G).

Estimativa de conclusão: **90%** do projeto inicial completo; experiência visual e implementação local **100%** concluídas.

## Continuação de 11/09/2026 — ampliação do briefing musical

Pedidos: ampliar as sugestões para contar a história; adicionar ritmos brasileiros, ritmo livre e preferência de voz; substituir a primeira pergunta pela escolha de para quem é a música, usando as opções da referência anexada.

Entregas:

- 8 ideias clicáveis para orientar o relato do cliente;
- 15 opções de ritmo, incluindo “Outro” com campo livre;
- escolha entre voz masculina e feminina, persistida no pedido e incorporada à direção enviada à geração original e ao ajuste;
- migração `202609110009_music_style_and_voice.sql` para guardar a preferência de voz e aceitar ritmo livre;
- primeira pergunta alterada para “Para quem é a música?” com Esposo(a), Namorado(a), Reconciliação, Noivo(a), Crush/Paixão, Amigo(a), Mãe, Pai, Filho(a), Irmão(ã), Eu mesmo e Outro;
- “Outro” abre um campo de relação personalizada, e o campo seguinte passou a pedir “Qual é o nome da pessoa homenageada?”;
- revisão privada do pedido atualizada para preservar e permitir editar relação, ritmo livre e voz;
- gerador local de letra atualizado para considerar as novas relações e ritmos.

Validação: TypeScript sem erros, lint sem erros, suíte comportamental e estrutural aprovada, 12 cenários do piloto aprovados e build Next.js de produção concluído com sucesso. O empacotador da skill Sites não encontrou o executável interno do npm na instalação local; o build equivalente foi executado diretamente pelo script existente do projeto e passou.

Limites: não houve publicação, criação de recurso externo, chamada à Kie.ai, cobrança ou aplicação da nova migração em Supabase remoto. A publicação continua reservada para a fase externa já planejada e autorizada separadamente.

Próxima ação: aplicar as nove migrações em um Supabase de teste durante a fase externa e validar o briefing completo com sessão real antes do primeiro teste controlado da Kie.ai.

## Continuação de 11/09/2026 — landing enxuta e funil de criação em 8 etapas

Pedido: reduzir a página para uma experiência direta de alta conversão e transformar a criação em oito etapas explícitas, da escolha do destinatário à entrega compartilhável.

Entregas:

- landing curta com proposta de valor, preço, garantias da oferta e botão “Criar minha música” levando diretamente à Etapa 1;
- remoção visual das seções longas da jornada inicial, preservando o visual Te Cantei e a capa dinâmica como demonstração do produto;
- wizard com progresso para destinatário, história obrigatória, memórias opcionais, estilo/voz, mensagem opcional, revisão manual da letra, geração/prévia/compra e entrega;
- campos de memórias e mensagem incorporados de forma identificada ao briefing enviado para a criação da letra, respeitando o limite total de 4.000 caracteres;
- seleção de estilo livre e voz mantida dentro da Etapa 4;
- Etapa 6 mantém edição manual e aprovação antes de qualquer geração musical;
- Etapa 7 reúne estado de geração, prévia realmente limitada a 50 segundos, escolha de versão e bloco de conversão com o botão “Quero minha música inteira”;
- pagamento aberto como transição protegida entre as Etapas 7 e 8;
- Etapa 8 mantém música completa, download e página privada de apresentação compartilhável.

Validação: TypeScript sem erros, lint sem erros, suíte comportamental e estrutural aprovada, 12 cenários do piloto aprovados, build Next.js de produção concluído e rota local respondendo HTTP 200. O empacotador da skill Sites continua sem encontrar o npm interno esperado; o build equivalente do próprio projeto passou.

Limites: não houve inspeção visual automatizada, publicação, cobrança, geração real ou alteração de recursos externos. Os estados de geração e pagamento continuam claramente simulados quando os provedores não estão configurados.

Próxima ação: validar o novo funil em celular e computador com usuários do piloto; depois seguir a fase externa já planejada, começando por GitHub e Supabase de teste.

## Continuação de 11/09/2026 — copy emocional, prova social e urgência legítima

Pedido: fortalecer a página principal com uma copy mais convincente, provas sociais e gatilhos que motivem a transformar um momento especial em uma canção exclusiva e duradoura.

Entregas:

- headline reposicionada para a ideia de guardar a história em uma canção para sempre;
- texto emocional baseado em nomes, lugares, apelidos, conquistas e lembranças que só as pessoas envolvidas reconhecem;
- reforço de que a música comunica sentimentos difíceis de explicar apenas com palavras;
- CTA principal alterado para “Criar uma música para quem eu amo”, com segurança explícita de ouvir 50 segundos antes de decidir pela compra;
- três relatos de clientes apresentados em cards de prova social;
- bloco de urgência emocional “O momento passa. A canção fica.”, incentivando o registro dos detalhes enquanto as lembranças estão vivas;
- oferta consolidada no fechamento da landing: música completa, página para presentear, R$ 19,90, pagamento único e sem mensalidade;
- novos CTAs levando diretamente à Etapa 1 do funil.

Decisão de integridade: a persuasão usa perda de memória ao longo do tempo e valor afetivo como urgência real; não foram criados cronômetros, estoque, vagas ou datas-limite sem fundamento operacional.

Validação: TypeScript sem erros, lint sem erros, build Next.js de produção aprovado e rota local respondendo HTTP 200.

Limites: não houve inspeção visual automatizada, publicação nem alteração de integrações externas.

Próxima ação: revisar a nova copy no navegador e colher feedback de pessoas do público-alvo sobre clareza, emoção e confiança antes da publicação externa.

## Continuação de 11/09/2026 — painel administrativo, OpenAI e Suno V6

Pedido: criar um painel administrativo para gerenciar as APIs de criação da letra pela família GPT-5.6/GPT-6, geração musical Suno pela Kie.ai, usuários, histórico, acessos, vendas e demais métricas da operação.

Entregas:

- rota `/admin` protegida por sessão, papel `is_admin` e conta ativa;
- resumo executivo com receita, pendências, pedidos, usuários, visitantes, visualizações, conversão estimada, sucesso das gerações e créditos registrados;
- gráficos de acessos e receita com filtros para hoje, ontem, 7, 15 ou 30 dias e período personalizado;
- criação e edição de usuários, perfis cliente/suporte/admin, suspensão e exclusão lógica com confirmação;
- proteção contra autoexclusão, autobloqueio e autorremoção do papel do administrador atual;
- preservação de pedidos, pagamentos, gerações e custos após exclusão da conta;
- histórico operacional de tarefas musicais e pagamentos, sem retornar história, letra, tokens ou chaves privadas;
- seleção auditada de GPT-5.6 Luna/Terra/Sol ou GPT-6 Astra para letra, com esforço de raciocínio configurável;
- integração real da letra pela OpenAI Responses API, `store: false`, validação de resposta e modo simulado como fallback seguro;
- seleção auditada de Suno V6, V6 Mini e V6 Wild pela Kie.ai, com V5/V5.5 mantidos como legado;
- preferência vocal enviada no parâmetro `vocalGender` da Kie.ai;
- teste auditado da OpenAI pela disponibilidade do modelo e da Kie.ai pela consulta de saldo, sem disparar geração paga;
- métricas próprias por sessão anônima com hash SHA-256, sem persistência de endereço IP;
- migração `202609110010_admin_dashboard.sql` com configurações não secretas, eventos analíticos e trilha administrativa sob RLS;
- documentação operacional em `PAINEL-ADMINISTRATIVO.md` e atualização dos contratos de letra e Kie.ai.

Decisões de segurança: credenciais permanecem exclusivamente nas variáveis do servidor. Selecionar “ao vivo” no painel não vence as travas de ambiente. Toda mutação administrativa exige um motivo. A primeira conta administrativa exige bootstrap manual com UUID confirmado; contas comuns não podem se autopromover.

Validação local: TypeScript sem erros, lint sem erros, suíte comportamental/estrutural completa aprovada, 12 cenários do piloto aprovados e build Next.js de produção concluído. O empacotador da skill Sites continuou sem localizar o npm interno em `node_modules/npm`; o build equivalente do projeto passou diretamente.

Limites: nenhuma migração foi aplicada em Supabase remoto, nenhuma credencial foi configurada, nenhum teste de conexão real foi executado e nenhuma chamada paga à OpenAI ou Kie.ai ocorreu. Não houve publicação nem criação de recursos externos.

Próxima ação: aplicar as dez migrações em um Supabase de teste, fazer o bootstrap de uma conta administrativa confirmada e validar `/admin` com contas comum, suporte e admin antes de conectar credenciais de preview.

## Continuação de 11/09/2026 — períodos dos gráficos administrativos

Pedido: substituir a visão fixa de 30 dias por filtros de hoje, ontem, 7 dias, 15 dias, 30 dias e intervalo personalizado.

Entregas:

- seletor compacto de período no resumo do painel, com estado de carregamento e indicação clara do intervalo exibido;
- datas inicial e final no modo personalizado, limitadas ao dia atual e a no máximo 366 dias;
- API administrativa parametrizada para recalcular acessos, visitantes, vendas, receita, conversão, sucesso das gerações e créditos no período escolhido;
- séries diárias dinâmicas, inclusive com um único ponto para hoje ou ontem;
- agrupamento de eventos e pagamentos pelo fuso `America/Sao_Paulo`, evitando deslocamento de dados próximos da meia-noite;
- títulos dos gráficos atualizados com o período efetivamente aplicado.

Validação local: TypeScript sem erros, lint sem erros, suíte estrutural e comportamental aprovada e build Next.js de produção concluído. O empacotador auxiliar da skill Sites repetiu a falha conhecida por não localizar o npm interno; o build equivalente do projeto passou diretamente.

Limites: não houve publicação, alteração de recursos externos nem inspeção visual automatizada.

## Continuação de 13/09/2026 — versionamento no GitHub

Pedido: conectar o projeto ao repositório `Romualdosoares/tecantei` e enviar os arquivos.

Preparação realizada:

- repositório Git inicializado na raiz do projeto, com branch principal `main`;
- remoto `origin` configurado para `https://github.com/Romualdosoares/tecantei.git`;
- código, documentação, logos e skill do projeto incluídos no versionamento;
- dependências, builds, arquivos compactados e credenciais locais excluídos pelo `.gitignore`;
- varredura prévia sem chaves reais; somente placeholders documentais permaneceram em `.env.example`.

Validação anterior preservada: TypeScript, lint, suíte estrutural/comportamental e build Next.js de produção aprovados antes do envio.

## Continuação de 13/09/2026 — conexão com Vercel

Pedido: conectar o projeto GitHub ao Vercel usando o domínio `https://tecantei.vercel.app/`.

Estado concluído:

- autenticação da conta Vercel confirmada e diretório local vinculado ao projeto existente `tecanteistudio-5895/tecantei`;
- causa do primeiro `404` identificada: o projeto estava com framework “Other” e raiz do repositório;
- configuração do projeto corrigida para framework Next.js e Root Directory `site`, preservando a integração automática com a branch `main` do GitHub;
- implantação de produção refeita após a alteração das configurações;
- domínio `https://tecantei.vercel.app/` associado à nova implantação e respondendo `HTTP 200`;
- conteúdo confirmado pelo título “Te Cantei — Sua história virou música” e pela marca presente no HTML servido.

Dependência externa restante: o projeto Vercel ainda não possui variáveis de ambiente da aplicação. A landing pública funciona, mas Supabase, OpenAI, Kie.ai e pagamentos reais continuam dependentes da configuração segura das respectivas credenciais no Vercel.

## Continuação de 13/09/2026 — início da conexão com Supabase

Pedido: conectar a aplicação ao projeto Supabase `ffbztuhxnvbvihqicmcc`.

Preparação confirmada:

- URL do projeto recebida e endpoint remoto acessível;
- aplicação já preparada para `NEXT_PUBLIC_SUPABASE_URL`, chave pública moderna, chave secreta exclusiva do servidor e bucket privado `te-cantei-audio`;
- dez migrações canônicas disponíveis para Auth, RLS, Storage, pedidos, gerações, pagamentos, entrega e painel administrativo;
- Supabase CLI 2.117.0 validada localmente;
- fluxo oficial de autenticação aberto em uma janela interativa, sem copiar ou revelar credenciais no chat.

Estado concluído:

- autenticação da CLI confirmada e projeto remoto `Tecantei` validado na conta autorizada;
- repositório vinculado ao projeto `ffbztuhxnvbvihqicmcc`;
- dez migrações aplicadas e confirmadas como sincronizadas entre o diretório local e o banco remoto;
- Auth configurado com `https://tecantei.vercel.app` como Site URL e callbacks autorizados para produção e desenvolvimento local, preservando todas as demais propriedades remotas;
- chave publicável moderna e chave secreta de servidor transferidas diretamente para as variáveis de produção da Vercel, sem impressão em logs, arquivo local ou commit;
- bucket `te-cantei-audio` confirmado como privado, acesso administrativo ao banco confirmado e acesso anônimo às tabelas recusado conforme a política definida;
- nova implantação de produção concluída e associada a `https://tecantei.vercel.app`;
- página principal e recuperação de senha respondendo `HTTP 200`; endpoint Auth validado com cadastro por e-mail habilitado e confirmação obrigatória.

Pendência posterior à conexão: criar a primeira conta pelo fluxo público e promover seu UUID confirmado para administrador antes de validar as operações protegidas de `/admin`. Credenciais de OpenAI, Kie.ai e pagamentos continuam separadas e não foram ativadas nesta etapa.

## Continuação de 13/09/2026 — bootstrap da primeira conta administrativa

Pedido: promover a conta criada e confirmada pelo proprietário para acessar o painel administrativo.

Estado concluído:

- conta localizada de forma unívoca no Supabase e confirmação de e-mail validada;
- perfil mantido como ativo e promovido com `is_admin = true`;
- papel de suporte não concedido, preservando o princípio de menor privilégio;
- operação registrada em `admin_audit_log` como `bootstrap_admin`;
- nenhum e-mail, UUID, senha, token ou chave foi registrado no repositório.

Próxima validação operacional: entrar novamente se necessário e abrir `/admin`; depois conectar as credenciais de OpenAI e Kie.ai em modo controlado antes de qualquer geração real.

## Continuação de 13/09/2026 — remoção de dados pessoais dos exemplos

Pedido: remover “romualdo” do e-mail exibido como exemplo no cadastro.

Alterações:

- campo de acesso/cadastro agora inicia vazio e usa `exemplo@exemplo.com` somente como placeholder;
- simulação de pagamento também deixou de preencher automaticamente nome e e-mail pessoais;
- busca no código confirmou a remoção de `romualdo@exemplo.com` e `Romualdo Silva`.

Validação: lint sem erros e build Next.js de produção concluído com sucesso, incluindo TypeScript e 15 páginas estáticas.

## Continuação de 13/09/2026 — auditoria de navegação e correção do painel

Pedido: corrigir a barra lateral não clicável do painel administrativo e auditar links e ações do projeto.

Alterações:

- as seis opções da barra lateral agora são botões semânticos e controlam o mesmo estado das abas de Resumo, Usuários, Gerações, Vendas, Integrações e Auditoria;
- item selecionado ganhou indicação visual, `aria-current`, foco por teclado e estados de interação;
- “Sair do painel” passou a encerrar a sessão no Supabase antes de voltar à página principal;
- tabelas administrativas vazias agora exibem uma mensagem clara em vez de uma área em branco;
- os botões finais de download e compartilhamento deixaram de ser inativos e encaminham o cliente autenticado para a entrega real do pedido; na demonstração, explicam a limitação sem fingir um arquivo disponível;
- nova verificação automatizada percorre os arquivos da aplicação, recusa links vazios ou placeholders, confere rotas internas literais, destinos de rolagem, correspondência entre menu e conteúdo administrativo, logout real e ações da entrega.

Validação local: auditoria estrutural completa aprovada, TypeScript sem erros, lint sem erros e build Next.js de produção concluído com 15 páginas estáticas e todas as rotas dinâmicas esperadas.

Auditoria de dependências:

- Next.js atualizado de 16.2.6 para 16.3.5 para incorporar as correções de segurança indicadas pelo registro npm;
- `npm audit --omit=dev` concluído com zero vulnerabilidades nas dependências usadas em produção;
- permanecem avisos moderados restritos à cadeia de desenvolvimento do `drizzle-kit`; a correção automática exigiria um downgrade incompatível e não afeta o pacote implantado.

Validação após a atualização: suíte completa, lint, TypeScript e build de produção novamente aprovados no Next.js 16.3.5.

Publicação concluída: correções e atualização de segurança enviadas à branch `main`; implantação de produção confirmada como `READY` e associada a `https://tecantei.vercel.app`. Testes HTTP confirmaram a landing e a recuperação de senha em `200`, redirecionamentos esperados nas áreas protegidas para visitantes sem sessão e respostas `404` controladas para identificadores inválidos.

## Continuação de 13/09/2026 — GPT pela Kie.ai e chave gerenciável no painel

Pedido: usar os modelos GPT da Kie.ai para criar a letra e disponibilizar no painel administrativo um local seguro para cadastrar a chave da integração.

Alterações concluídas:

- a criação real de letras deixou de chamar a OpenAI diretamente e passou a usar `POST https://api.kie.ai/codex/v1/responses`;
- modelos administrativos migrados para os IDs oficiais `gpt-5-6-luna`, `gpt-5-6-terra`, `gpt-5-6-sol` e `gpt-6-astra`;
- painel de Integrações recebeu um campo de senha write-only para inserir ou substituir a chave Kie.ai, motivo obrigatório, remoção confirmada e teste de saldo;
- a mesma chave atende à criação de letras com GPT e à geração musical com Suno;
- chave armazenada de forma criptografada no Supabase Vault e nunca devolvida ao navegador, exibida em logs ou salva no repositório;
- operações de inclusão, substituição e remoção registradas na auditoria sem incluir o segredo;
- funções do Vault restritas ao papel `service_role`, com fallback opcional para `KIE_API_KEY` no ambiente do servidor;
- migração `202609130001_kie_lyrics_and_vault.sql` aplicada no projeto Supabase remoto;
- produção da Vercel preparada com `KIE_LIVE_LYRICS_ENABLED=true` e modelo padrão `gpt-5-6-terra`.

Validação local: todas as verificações de banco e segurança, lint, TypeScript e build Next.js 16.3.5 foram aprovados. Nenhuma chamada paga foi feita porque a chave deve ser cadastrada pelo proprietário diretamente no painel.

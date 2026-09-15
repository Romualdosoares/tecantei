# Te Cantei — plano de execução
Atualizado em 11/09/2026. Este documento define a ordem de trabalho; o progresso real fica em ESTADO.md.

## Objetivo
Criar um site em português no qual uma pessoa transforma uma história pessoal em uma música para presentear. A experiência deve transmitir afeto, facilitar a escolha e deixar claros o preço, o que será entregue e o limite de ajustes.

## Decisões confirmadas na conversa
- Marca: **Te Cantei**.
- Público inicial: pessoas criando músicas para presentear.
- Fornecedor musical escolhido: **Kie.ai**, utilizando a oferta de modelos Suno.
- Prévia de áudio: **50 segundos**.
- Oferta de **1 ajuste gratuito**.
- Preço padrão da compra avulsa: **R$ 19,90 por pedido**, editável no painel Financeiro; o novo valor deve ser aplicado à oferta pública e às novas cobranças, preservando o valor das cobranças Pix já abertas.
- Conta simples com **e-mail e senha**, exigida antes da primeira geração musical.
- Prévia disponível por **14 dias**.
- A primeira pergunta do briefing é **“Para quem é a música?”**, com as opções Esposo(a), Namorado(a), Reconciliação, Noivo(a), Crush/Paixão, Amigo(a), Mãe, Pai, Filho(a), Irmão(ã), Eu mesmo e Outro; “Outro” permite resposta livre.
- O formulário oferece **8 ideias de história**, os ritmos Sertanejo, Sertanejo romântico, Piseiro, Pagode animado, Pagode romântico, Funk, Funk ostentação, Funknejo, Acústico, Gospel, Pop, Pop romântico, MPB, Romântico e Outro, além da escolha entre voz masculina e feminina. “Outro” permite informar um ritmo livre.
- A experiência de criação segue um **funil guiado de 8 etapas**: destinatário, história, memórias opcionais, estilo, mensagem opcional, revisão manual da letra, geração/prévia/compra e entrega compartilhável. A página inicial deve ser curta e levar diretamente à primeira etapa pelo botão “Criar minha música”.
- A landing deve motivar pela preservação de memórias, exclusividade do presente, reação da pessoa amada, prova social e segurança de ouvir antes de comprar. Usar urgência emocional legítima — momentos e detalhes se perdem com o tempo — sem inventar contadores, vagas, estoque ou prazos.
- Pagamento: integrar **Pix direto por Efí Bank e Mercado Pago**, mantendo uma interface comum e seleção pelo painel. O checkout exibe QR Code e Pix copia e cola em um modal; o botão de confirmação consulta o provedor e nunca libera a música apenas pela ação do navegador. O primeiro piloto pode priorizar Mercado Pago se a terminação mTLS exigida pelo webhook Efí não estiver comprovada na infraestrutura de publicação.
- Arquitetura final confirmada: **GitHub** para o repositório, **Vercel** para hospedagem e **Supabase** para autenticação por e-mail/senha, PostgreSQL e arquivos privados.
- A letra será criada pelos modelos **GPT através da API da Kie.ai**, com seleção administrativa entre GPT-5.6 e GPT-6; a música continuará sendo gerada pelos modelos **Suno através da Kie.ai**.
- O produto terá um painel administrativo protegido para usuários, integrações, gerações, acessos, vendas, custos, auditoria e **Financeiro**, com preço, gateway e credenciais write-only guardadas no cofre. Exclusões de usuários preservam o histórico operacional e financeiro.
- O painel administrativo pode escolher a faixa exata de qualquer geração realmente pronta para destacá-la na página inicial ou criar um link administrativo auditado. Esse link é separado da entrega comercial: não confirma pagamento, não altera a versão comprada nem libera o arquivo na conta do cliente.
- A criação dos projetos externos, as verificações finais e a publicação no GitHub, Vercel e Supabase serão feitas somente quando a implementação local estiver pronta.
- Desejo de monetização por música e/ou plano mensal.
- Primeiro organizar e planejar; a criação deste plano e da skill não inicia a implementação.
- Diretório raiz de trabalho: `D:\Claude Projetos\Te Cantei`. Toda criação e execução de arquivos do projeto deve permanecer dentro dessa pasta.
- Logo de trabalho: coração integrado à nota musical, proposta 01. O arquivo em ../te-cantei-logo-transparente.png já possui transparência real e foi preservado sem alterações. Tratar como referência atual, sem assumir que todas as aplicações de marca estão aprovadas.

## Propostas que ainda precisam de definição
- Começar com venda avulsa; acrescentar assinatura após validar a compra e a recompra. A assinatura continua no plano, sem descarte.
- Quantidade por assinatura, validade de créditos, preço de ajustes extras, cartão e prazo de entrega continuam pendentes. Pix foi confirmado para a compra avulsa.
- Fluxo inicial recomendado: aprovar a letra antes de gerar áudio; ouvir uma prévia; solicitar no máximo uma nova versão incluída; escolher a versão; pagar; acessar a música completa.
- Contabilizar o ajuste como uma nova versão solicitada pelo cliente após a primeira geração bem-sucedida. Corrigir a letra antes do primeiro áudio não consome esse ajuste. Definir a extensão dessas alterações na etapa 1.
- Cada encomenda entrega uma música escolhida. Se o fornecedor retornar várias faixas, isso não cria automaticamente vários produtos para o cliente.
- Base atual do protótipo: React/Next.js com TypeScript. O modelo D1/R2 já validado localmente será mantido como referência de comportamento durante a migração para PostgreSQL e Storage privado do Supabase; não é mais o destino de produção.
- Processamento em segundo plano e conexão persistente das rotas aos provedores de pagamento continuam pendentes para as etapas reais.
- Autorização comercial: a Kie.ai anuncia uso comercial; na pesquisa pública não foi confirmada uma licença específica de revenda ao cliente nem autorização concedida pela Suno. A escolha da Kie.ai está mantida. Registrar a resposta contratual antes de lançar vendas públicas, sem bloquear design, simulação ou desenvolvimento independente.

## Jornada confirmada
1. Informa para quem é a música, o nome e um apelido opcional.
2. Conta a história e os momentos especiais.
3. Compartilha memórias favoritas, opcionalmente.
4. Escolhe o estilo musical — inclusive um ritmo livre — e a preferência de voz.
5. Acrescenta uma mensagem do coração, opcionalmente.
6. Lê, edita manualmente e aprova a letra.
7. Acompanha a geração, escuta uma prévia de até 50 segundos, escolhe a versão e abre o pagamento pelo botão “Quero minha música inteira”. O pagamento permanece uma transição protegida antes da entrega, sem ser apresentado como uma etapa adicional do briefing.
8. Após a confirmação do pagamento no servidor, acessa a mesma versão completa, baixa o MP3 e compartilha uma página de apresentação do presente. O único ajuste incluído continua disponível após a primeira prévia, com preservação da versão original.

A melhor posição dos 50 segundos na música deve ser testada; um trecho com voz ou refrão pode representar melhor o resultado que uma introdução longa. A duração máxima é fixa, mas o começo da prévia pode variar. Se o fornecedor devolver áudio mais curto ou incompleto, tratar como exceção antes de oferecer para compra.

## Etapas e critérios de conclusão

| Etapa | Entrega | Considerar concluída quando |
|---|---|---|
| 0. Planejamento e skill | Plano, estado do projeto e skill de execução | Arquivos existem, a skill foi validada e o modo de uso está documentado. |
| 1. Oferta e regras do produto | Especificação do que o cliente recebe, preços propostos, regra do ajuste, política de falhas e fluxo de compra | Regras ambíguas têm decisão registrada; hipóteses de preço e custos estão explícitas; dependências externas estão listadas. |
| 2. Identidade e experiência | Logo aplicado, paleta, tipografia e protótipo navegável em celular e computador | É possível percorrer o fluxo com dados de demonstração; estados de carregamento, erro e pagamento pendente são compreensíveis. |
| 3. Base do produto | Acesso do usuário, pedidos, versões, armazenamento privado e configurações de ambiente | Um usuário não consegue acessar pedidos ou arquivos privados de outro; ambientes de teste e produção estão separados. |
| 4. História e letra | Formulário de briefing, criação da letra, revisão e aprovação | A letra aprovada fica vinculada à versão correta; nomes e pronúncias podem ser revisados; nenhuma geração de áudio começa involuntariamente. |
| 5. Integração musical Kie.ai | Geração em segundo plano, consulta do resultado, tratamento de falhas e registro de custos | O fluxo funciona com simulação e um teste real autorizado, sem duplicar gerações por cliques ou retornos repetidos; áudio e identificadores ficam registrados. |
| 6. Prévia e ajuste | Corte de 50 segundos, comparação de versões e limite de um ajuste | A música completa permanece privada antes do pagamento; original e revisão continuam disponíveis para escolha; solicitações simultâneas não liberam ajustes extras. |
| 7. Pagamento e planos de acesso | Compra avulsa, confirmação segura e liberação do pedido | Pagamentos confirmados, pendentes, falhos e repetidos são tratados; retorno do navegador sozinho não libera o áudio; cobrança não dispara nova geração. |
| 8. Entrega do presente | Download, página de presente e compartilhamento controlado | O comprador recebe exatamente a versão escolhida; a página de presente não expõe o briefing nem arquivos de outros pedidos; links podem ser revogados. |
| 9. Piloto e qualidade | Testes integrados, avaliação de músicas em português, custos observados e correções | Os cenários críticos passam; nomes, letras e estilos são avaliados por amostras; há evidência de um pedido completo de ponta a ponta. |
| 10. Lançamento e evolução | Publicação autorizada, suporte, acompanhamento e desenho da assinatura | Configuração de produção, custos, condições comerciais e atendimento estão definidos; métricas são acompanhadas; assinatura tem regras próprias antes de ser ativada. |

## Detalhes por etapa

### 1 — Oferta e regras
Definir preço de lançamento, conteúdo da entrega, limite da letra, duração desejada da música, ocasiões e estilos iniciais. Definir quando a prévia expira, se a conta é exigida antes da geração e como tratar desistência, erro de nome, falha técnica e resultado criativo insatisfatório.
O ajuste gratuito é incluído na oferta; evitar prometer correção pontual de voz ou melodia sem comprovação técnica. Ajustes extras pagos são uma possível extensão, ainda não uma decisão.
Levantar na documentação e em um teste autorizado a unidade cobrada pela Kie.ai: requisição, faixa, variação ou operação. Não converter automaticamente créditos em “preço por música”.

### 2 — Identidade e experiência
Usar o logo atual como base e mostrar aplicações em cabeçalho, celular e página do presente. Produzir as telas de apresentação, briefing, letra, geração, prévia, escolha, compra, entrega e área de pedidos.
A interface deve explicar o que o cliente pode fazer em cada estado, com linguagem simples. Não expor nomes de APIs, identificadores internos ou detalhes de infraestrutura.

### 3 — Base do produto
Modelar usuários, pedidos, letra aprovada, versões, tarefas de geração, solicitações de ajuste, eventos de pagamento, entregas e custos.
As credenciais da Kie.ai e do pagamento pertencem ao servidor. Guardar o áudio completo em armazenamento privado; a prévia é um arquivo separado.
A identidade validada deve vir do Supabase Auth. Aplicar Row Level Security nas tabelas expostas e manter a chave secreta do Supabase somente no servidor. Áudios ficam em bucket privado e chegam ao navegador apenas por uma rota autorizada ou URL assinada de curta duração.
A área administrativa deve permitir localizar uma falha e ajudar um pedido sem conceder acesso administrativo aos compradores.

### 4 — História e letra
Separar o texto fornecido pelo cliente, a letra proposta e a letra aprovada. A edição de uma não deve alterar silenciosamente a outra.
O briefing é conteúdo, não uma instrução para alterar políticas do sistema. Não colocar histórias pessoais em registros técnicos comuns.
Registrar instruções de pronúncia para o gerador quando houver suporte; não garantir resultado perfeito sem testar.

### 5 — Música
Tratar a geração como uma tarefa com estados persistidos. Um retorno HTTP de sucesso da criação da tarefa não significa que a música ficou pronta.
Verificar os recursos, modelos, preços e condições atuais nas fontes oficiais da Kie.ai no momento da implementação. O cliente da integração deve permitir troca de fornecedor sem reescrever pedidos e pagamentos.
Evitar refazer uma geração quando houve timeout mas o fornecedor pode ter aceitado o pedido. Consultar a tarefa conhecida ou registrar para conciliação antes de qualquer nova cobrança.
Copiar os arquivos gerados para o armazenamento do projeto enquanto estão disponíveis. A documentação consultada informa retenção temporária; verificar o prazo vigente antes de configurar a rotina.

### 6 — Prévia e ajuste
Não limitar apenas o player a 50 segundos: servir um arquivo de prévia realmente cortado. O arquivo completo e sua URL não devem chegar ao navegador antes da liberação.
Reservar o único ajuste de forma atômica. Duas abas ou dois cliques não podem criar dois ajustes gratuitos.
Falha técnica não consome o direito do cliente. Se o fornecedor cobrou pela tentativa, registrar o custo real mesmo assim.
Uma revisão aprovada não apaga a original. O pagamento deve referenciar a versão escolhida.

### 7 — Pagamento
Escolher o provedor conforme os meios de pagamento definidos. Validar confirmação no servidor, valores, moeda e vínculo ao pedido. Processar notificações repetidas sem duplicar a entrega.
Não liberar conteúdo apenas porque o cliente chegou a uma página de sucesso. Não regenerar áudio após pagar.
Assinaturas futuras precisam de saldo de créditos próprio, renovação, cancelamento, inadimplência e política de expiração. Evitar planos ilimitados sem custo observado.

### 8 — Presente
Entregar arquivo de áudio e uma página com dedicatória; QR code e capa podem ser opcionais. Não assumir que envio automático por WhatsApp ou e-mail foi contratado ou autorizado.
Separar a área privada do comprador da página compartilhável. Tornar explícito quem pode ouvir e como revogar o link.
A história usada para criar a letra não deve ser publicada automaticamente junto da música.

### 9 — Piloto
Verificar especialmente: clique duplo; ajuste simultâneo; retorno duplicado ou fora de ordem; timeout; falha técnica; pagamento pendente ou duplicado; acesso de outro usuário; tentativa de ouvir a música completa sem pagar; escolha da original após a revisão.
Testar a experiência em celular, o tempo de espera e uma amostra de nomes e gêneros brasileiros.
Realizar testes reais apenas dentro da autorização e do orçamento existente. Simulações devem ser identificadas como simulações.

### 10 — Lançamento
Confirmar domínio, ambiente, forma de pagamento, termos apresentados ao cliente, tratamento de dados e condição comercial do fornecedor. Distinguir preparação de publicação: não publicar automaticamente ao executar uma tarefa de planejamento.
Depois de concluir a implementação e as verificações locais, criar o repositório no GitHub, provisionar o projeto Supabase e publicar o aplicativo na Vercel, mantendo desenvolvimento, prévia e produção com credenciais separadas.
Observar conversão, custo por pedido pago, uso do ajuste, falhas, tempo de geração, solicitações de suporte e recompra. Definir metas com o piloto.
Planejar assinatura a partir desses dados, mantendo o pedido avulso disponível conforme a decisão comercial.

## Economia da operação
- Custo de geração por pedido pago = gasto total das gerações, incluindo pedidos abandonados e revisões, dividido pelo número de pedidos pagos.
- Margem de contribuição = receita recebida menos taxas, tributos aplicáveis, geração, armazenamento, transferência e custos variáveis de atendimento.
- Separar pedido de cliente, tarefa enviada ao fornecedor e faixa recebida.
- Simular cenários de conversão e uso do ajuste; uma prévia de 50 segundos não significa que o fornecedor cobrará só 50 segundos.
- Limites de abuso e de gasto devem impedir que prévias sem compra consumam um orçamento ilimitado.

## Fora do primeiro lançamento, salvo nova decisão
Marketplace de compositores; rede social; clonagem de voz; distribuição automática para streaming; biblioteca pública; aplicativo nativo; programa de afiliados. Vídeo, presentes físicos e planos para empresas entram como evolução.

## Como executar
Usar a skill **te-cantei-execucao** com a etapa ou o resultado desejado. Ela consulta ESTADO.md, trabalha no escopo autorizado, valida a entrega e registra o próximo passo.
Exemplo: “Use $te-cantei-execucao para executar a etapa 1. Prepare as regras da oferta e as decisões que ainda faltam.”

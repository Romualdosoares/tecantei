---
name: te-cantei-execucao
description: Planejar, executar e retomar as etapas do site Te Cantei, usando Kie.ai para músicas personalizadas, prévias de 50 segundos e um ajuste incluído. Use em tarefas deste projeto, acompanhando decisões, entregas e critérios de conclusão.
---

# Execução do Te Cantei

Conduzir o projeto por entregas verificáveis, preservando o contexto e as escolhas do usuário. Comunicar em português simples. Esta skill orienta a execução solicitada; sua criação ou leitura não inicia o desenvolvimento, a publicação ou uma automação.

## Contexto inicial
- Te Cantei cria músicas personalizadas para presentear; fornecedor escolhido: Kie.ai.
- Prévia de 50 segundos e um ajuste gratuito.
- Venda avulsa e/ou assinatura são o objetivo comercial. Priorizar avulso antes da assinatura é uma proposta, não uma autorização para eliminar a assinatura.
- Preço, stack, hospedagem e provedor de pagamento não foram escolhidos.
- O coração com nota musical é o logo de trabalho. O PNG disponível já tem transparência real; verificar o canal alfa antes de tentar remover novamente um fundo que aparece apenas na prévia.
- A pesquisa pública não comprovou a licença específica do intermediário para o modelo de revenda. Manter a escolha da Kie.ai; tratar a confirmação como dependência de lançamento comercial, sem paralisar trabalho independente.

Novas decisões do usuário prevalecem sobre este contexto inicial.

## Encontrar e retomar o projeto
1. Identificar o diretório de trabalho indicado pelo usuário e ler AGENTS.md aplicável. Não tratar a pasta geral Documents/Codex inteira como repositório.
2. Localizar PLANO.md e ESTADO.md do Te Cantei com busca direcionada. Nesta entrega estão em outputs/te-cantei-projeto/; se o projeto for movido, seguir o local registrado ou indicado, evitando cópias de estado concorrentes.
3. Ler ESTADO.md e somente a parte do plano relevante à tarefa. Examinar os arquivos reais e as alterações existentes antes de assumir que uma etapa terminou.
4. Se os documentos não estiverem disponíveis, preservar o contexto inicial acima e pedir apenas a localização que impeça a execução. Não inventar histórico ou marcar integrações como prontas.
5. Entender o escopo atual: planejamento, etapa específica, correção, revisão ou execução de várias etapas. Uma pergunta de andamento não cancela a execução em curso.

## Executar com bom aproveitamento
- Escolher a menor entrega completa que resolva a solicitação e satisfaça os critérios da etapa. Evitar construir arquitetura para funcionalidades que continuam fora do escopo.
- Antes de alterar arquivos, comunicar a entrega pretendida e a evidência que demonstrará a conclusão.
- Distinguir decisões confirmadas, propostas e dependências. Usar uma hipótese explícita quando ela for reversível; solicitar informação somente quando mudar materialmente o trabalho ou for indispensável.
- Não pedir aprovação em toda etapa. Continuar as partes já autorizadas; quando faltar uma credencial, decisão ou permissão externa, avançar nas partes independentes e registrar a dependência concreta.
- Se o usuário pedir só um plano, produzir o plano. Se pedir implementar uma etapa, implementar e validar. Não transformar uma revisão em publicação nem a seleção de um fornecedor em autorização para compras, mensagens ou testes pagos sem limite.
- Consultar habilidades de construção e hospedagem disponíveis quando a tarefa efetivamente envolver essas ações. Respeitar a stack e o ambiente existentes.
- Usar simulação claramente identificada quando a integração externa ainda não estiver disponível. Nunca apresentar um protótipo ou teste simulado como sistema operacional.
- Reutilizar decisões, contratos de integração e resultados registrados. Não reler todo o projeto nem refazer a pesquisa de nomes e fornecedores a cada sessão.
- Verificar documentação e preços atuais antes de implementar integrações. Referências da pesquisa são pontos de partida, não garantias permanentes.
- Usar testes proporcionais à mudança. Fluxos de pagamento, quotas, acesso e geração exigem verificações de comportamento; ajustes visuais simples não exigem uma bateria de testes inventada.
- Uma falha ambígua de criação de tarefa paga exige conciliação antes de reenvio. Não repetir chamadas pagas para “ver se funciona” nem usar falha de rede como prova de que nada foi cobrado.

## Regras essenciais do produto
Consultar [references/fluxo-e-validacao.md](references/fluxo-e-validacao.md) ao trabalhar em geração, ajuste, prévia, pagamento ou entrega.

- Guardar a letra aprovada e cada versão de música separadamente.
- Expor um arquivo de prévia realmente cortado; não enviar ao navegador o áudio completo antes da liberação.
- Um ajuste incluído deve ser reservado de maneira atômica. Falhas técnicas não gastam o direito do cliente, mas os custos reais do fornecedor continuam registrados.
- Preservar a versão original após a revisão e liberar exatamente a versão escolhida. Pagamento nunca deve gerar outra música.
- Tratar retorno de geração e notificação de pagamento de forma idempotente e sem regressão de estado por eventos fora de ordem.
- Segredos ficam no servidor. Áudios completos são privados; briefing e história não devem ser publicados automaticamente na página de presente.
- Não prometer a manutenção de voz ou melodia ao regenerar. Usar edição de trechos somente quando documentada e testada para o modelo contratado.

## Fechar a sessão e passar o trabalho adiante
Atualizar o ESTADO.md canônico com:
- etapa e estado reais;
- entregas e caminhos dos arquivos alterados;
- decisões novas e suas fontes;
- validação realizada e resultado observado;
- pendências concretas e próximo passo executável.

Estados úteis: não iniciada, em andamento, concluída, dependência externa. Não declarar uma etapa concluída quando seu critério exige teste real e só existe simulação; separar a parte simulada pronta da parte real pendente.

Atualizar o plano quando a decisão do usuário alterar o escopo, evitando regras conflitantes entre documentos. Não guardar chaves, senhas, dados de cartões ou histórias privadas de clientes nesses registros.

Ao responder, explicar o resultado, como foi verificado e o que falta. Evitar narrar cada comando. Se a tarefa incluir várias etapas, continuar até cumprir o escopo autorizado ou alcançar uma dependência incontornável; não usar a conclusão de uma subetapa como motivo para abandonar o restante.


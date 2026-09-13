# Fluxo, integração e validação do Te Cantei

Ler apenas nas etapas que envolvam geração, prévia, revisão, pagamento e entrega. O PLANO.md do projeto contém as decisões comerciais atuais; estas regras não substituem mudanças explícitas do usuário.

## Fontes de integração
- Produto Kie.ai: https://kie.ai/suno-api
- Introdução: https://docs.kie.ai/
- Integração Suno: https://docs.kie.ai/suno-api/quickstart
- Preços: https://kie.ai/pricing
- Termos: https://kie.ai/terms-of-use

Verificar versões e comportamento no momento da implementação. A pesquisa anterior observou uma alegação de uso comercial, mas não comprovou autorização da Suno ou cláusula específica para venda ao cliente final. Não converter essa ausência de comprovação em uma afirmação de ilegalidade nem em autorização já obtida.

## Modelo de domínio recomendado
Separar pedido, letra aprovada, versão de música, tarefa do fornecedor, ajuste, pagamento e entrega.
Uma tarefa pode retornar várias faixas; modelar essa relação sem assumir “uma requisição = uma música = um crédito”.
Guardar o identificador externo e um identificador interno estável. Registrar tentativas e custos separadamente do saldo de direitos do cliente.

## Estados e conciliação
- Letra: rascunho → aprovada. Edição posterior produz uma revisão explícita.
- Tarefa: criada → enviada → em processamento → concluída ou falhou; quando a aceitação do fornecedor é desconhecida, registrar em conciliação.
- Pedido: gerando → prévia disponível → versão escolhida → pagamento pendente → pago → entregue. Permitir os retornos necessários do usuário sem reabrir cobranças ou alterar arquivos pagos.
- Ajuste: disponível → reservado → concluído. Falha técnica comprovada devolve a disponibilidade. Uma tentativa cujo resultado é desconhecido continua reservada até conciliação.

Persistir transições e tratar notificações duplicadas. Eventos atrasados não podem fazer um pedido pago voltar a pendente ou criar nova entrega cobrada.
Confirmar como o provedor autentica callbacks; se não houver assinatura documentada, confirmar o estado pela consulta autenticada antes de liberar conteúdo ou consumir direitos de modo definitivo.

## Geração e limites
- Credenciais no servidor, nunca em código entregue ao navegador.
- Registrar custos com modelo e unidade de cobrança verificados.
- Definir limites de geração por usuário e orçamento da operação, conforme a oferta. Não inventar um limite comercial na interface sem registrar a hipótese.
- Para erro transitório em consultas, aplicar espera crescente e tentativas limitadas.
- Para criação ambígua, consultar uma tarefa conhecida ou conciliar antes de gerar novamente; não presumir suporte a idempotência do fornecedor.
- Baixar o áudio para armazenamento próprio antes do vencimento dos links do fornecedor. Só aceitar arquivos e origens esperados, com validação de tamanho e formato.
- Tratar falha, moderação de conteúdo, áudio incompleto e limite de créditos como estados diferentes quando o fornecedor fizer essa distinção.

## Prévia e escolha
O servidor cria um arquivo de até 50 segundos a partir da faixa completa. O começo do trecho pode ser configurável, mas deve representar a faixa que será entregue.
O arquivo completo permanece privado. Não confiar em ocultação de botão, limite do player ou URL difícil de adivinhar.
O cliente pode comparar a original e a revisão incluída. Vincular checkout e entrega à versão selecionada; não usar um ponteiro mutável chamado “última música”.

## Ajuste
A oferta atual inclui um ajuste. A definição proposta é uma nova versão depois da primeira geração concluída; conferir a decisão atual no plano.
A reserva é atômica por pedido e precisa resistir a duas abas, cliques repetidos e tarefas concorrentes.
Uma falha técnica não retira o direito do cliente. Um resultado criativo válido de que o cliente não gostou segue a política comercial, sem ser classificado automaticamente como falha técnica.
Caso a edição pontual não seja suportada, explicar ao cliente que a nova geração poderá alterar voz, melodia ou arranjo.

## Compra e entrega
Validar pagamentos no servidor, vinculados ao pedido, ao valor e à moeda corretos.
Processar eventos repetidos de forma idempotente. Estados pendentes não liberam a faixa.
Download e página de presente devem observar os direitos do pedido; comprador e destinatário podem ter acessos diferentes.
Gerar URLs temporárias para conteúdo privado quando apropriado. Tornar revogável o compartilhamento do presente sem expor a história do briefing.
Não usar dados de cartão em registros do projeto. Usar checkout do provedor escolhido.
Não enviar mensagens automáticas a destinatários nem contratar serviços adicionais por inferência.

## Cenários de aceitação
1. Duplo clique em gerar resulta em uma operação lógica, sem duplicação silenciosa de gasto.
2. Timeout após envio não provoca outra geração antes da conciliação.
3. Dois pedidos simultâneos de ajuste não excedem o único ajuste incluído.
4. Falha técnica devolve o direito de ajuste sem apagar o custo que efetivamente ocorreu.
5. Retorno repetido ou atrasado não sobrescreve versão escolhida nem regride o estado.
6. Antes do pagamento, nenhuma rota entrega o áudio completo ao cliente.
7. Usuário A não lê o pedido, briefing ou áudio privado de B.
8. Pagamento pendente não libera música; pagamento repetido não entrega nem cobra novamente.
9. Comprar a original depois de ouvir a revisão entrega exatamente a original.
10. Expiração do link da Kie.ai não destrói uma entrega já salva no projeto.
11. Página do presente não publica história privada ou letra não aprovada.
12. A experiência em celular permanece compreensível durante espera, erro e retorno do pagamento.

Registrar quais cenários foram simulados e quais foram testados com fornecedores reais. Se uma mudança só afetar um subconjunto, testar esse comportamento e os riscos diretamente relacionados.


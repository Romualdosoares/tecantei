# Te Cantei — oferta e regras do produto

Versão 0.2, atualizada em 10/09/2026. Esta especificação transforma a Etapa 1 do plano em regras implementáveis. A cobrança real continua condicionada à integração e validação do provedor de pagamento.

## Oferta-base

O Te Cantei transforma uma história pessoal em uma música para presentear. No lançamento inicial, a experiência será uma compra avulsa. A assinatura continua planejada, mas só será desenhada depois que o piloto medir recompra, custo e uso do ajuste.

Cada pedido inclui:

- coleta guiada da história, nomes, pronúncias, ocasião, estilo e clima;
- uma letra para revisão e aprovação antes de gerar áudio;
- uma primeira geração musical;
- prévia de até 50 segundos de cada versão oferecida para escolha;
- um ajuste incluído, realizado como nova versão quando solicitado;
- escolha da versão final pelo cliente;
- arquivo MP3 completo da versão escolhida após o pagamento;
- página privada de presente com dedicatória e link revogável.

Uma requisição ao fornecedor pode devolver múltiplas faixas. Isso não aumenta automaticamente a quantidade de produtos do pedido: o cliente compra e recebe uma única versão escolhida.

## Condições comerciais confirmadas

- Preço da compra avulsa: **R$ 19,90 por pedido**.
- O primeiro lançamento não oferece ajustes extras pagos nem assinatura ativa.
- A tela pode mostrar “valor de lançamento”, mas não deve fingir desconto sem preço anterior real.
- Nenhuma cobrança real será ativada antes da escolha do provedor de pagamento e da validação das condições comerciais do fornecedor.

## Limites e catálogo inicial

- Ocasiões: aniversário, casal, família, amizade e homenagem.
- Estilos iniciais: pop romântico, MPB, sertanejo, pagode, acústico e gospel. Outra referência pode ser descrita sem pedir cópia de artista ou obra protegida.
- História: entre 200 e 4.000 caracteres no formulário.
- Letra aprovada: meta editorial de 1.200 a 2.500 caracteres e limite técnico de 5.000 caracteres no modelo atual.
- Duração desejada: entre 2min30 e 4min. A duração final pode variar e deve ser exibida antes da compra.
- Conta: exigida antes da primeira geração de áudio, não antes de preencher ou revisar a história.
- Prévia: disponível por **14 dias** no pedido.

## Letra e aprovação

O texto original do cliente, a letra proposta e a letra aprovada são registros separados. Editar uma versão não altera silenciosamente as anteriores.

O cliente pode corrigir nomes, pronúncias e fatos antes da primeira geração sem consumir o ajuste. O botão de aprovação precisa dizer claramente que a aprovação inicia a etapa de música; preencher ou salvar a história nunca dispara áudio por conta própria.

## Regra do ajuste incluído

1. O ajuste fica disponível depois que a primeira geração é concluída com uma prévia válida.
2. Solicitar o ajuste reserva o único direito de forma atômica, impedindo dois usos por clique duplo ou abas simultâneas.
3. O ajuste produz uma nova versão e pode alterar voz, melodia e arranjo. A interface não promete correção pontual.
4. A versão original permanece disponível para comparação e compra.
5. Falha técnica confirmada devolve o direito ao ajuste. Se houve custo real do fornecedor, esse custo continua registrado.
6. Resultado tecnicamente válido que não agradou ao cliente consome o ajuste; insatisfação criativa não é classificada automaticamente como falha técnica.
7. Uma tentativa de estado desconhecido permanece reservada até conciliação; não se envia outra geração paga apenas por timeout.

## Falhas, desistência e moderação

- Falha antes de existir prévia válida: manter o pedido e permitir nova tentativa somente após confirmar que não haverá duplicação de cobrança.
- Conteúdo recusado por moderação: devolver o pedido para revisão da letra ou do briefing, preservando o texto anterior.
- Áudio incompleto ou curto demais: não colocar à venda; classificar como exceção técnica e conciliar custo e nova tentativa.
- Erro de nome aprovado pelo cliente: pode usar o ajuste incluído. Erro introduzido pelo sistema depois da aprovação deve ser corrigido sem consumir o direito.
- Desistência antes do pagamento: não há cobrança do cliente, mas os custos de geração entram na economia da operação.

## Compra e entrega

- O checkout só começa depois que o cliente escolhe uma versão.
- A versão escolhida, o valor e a moeda ficam congelados na intenção de pagamento.
- Retorno do navegador ou tela de sucesso não libera a música; apenas confirmação verificada no servidor.
- Pagamento pendente, falho ou repetido não cria nova geração e não duplica a entrega.
- Após confirmação, liberar exatamente o MP3 escolhido e a página do presente.
- O briefing e a história privada nunca entram automaticamente na página compartilhável.
- O link do presente pode ser revogado pelo comprador.

## Custos observáveis

Na consulta oficial de 10/09/2026, a geração musical custava **12 créditos por requisição (aprox. US$ 0,06)** e a documentação informava que uma requisição gera múltiplas variações. Custo por requisição, faixas recebidas e música efetivamente vendida precisam ser registrados separadamente.

O caminho padrão pode consumir até duas requisições de áudio — primeira geração e ajuste —, isto é, 24 créditos (aprox. US$ 0,12) antes de considerar novas tentativas, letras, armazenamento, câmbio, taxas e abandonos. Esse cálculo é uma referência operacional, não o custo final de uma venda.

Registrar por pedido: saldo antes e depois da chamada quando disponível; operação, modelo e tabela de preço; tarefa, tentativa e faixas retornadas; custo confirmado, estornado ou em conciliação; motivo da falha; consumo do direito do cliente; receita e custos variáveis.

## Dependências antes de cobrar em produção

- aprovação do preço de lançamento;
- escolha e conta de um provedor de pagamento com Pix e cartão;
- teste real autorizado da Kie.ai para confirmar qualidade em português, quantidade de faixas, duração, cobrança e callbacks;
- confirmação contratual de que a cadeia de licenças permite a venda e entrega ao cliente final;
- definição de suporte, cancelamento e textos legais aplicáveis no Brasil;
- definição de domínio, hospedagem e retenção dos arquivos entregues.

## Fontes oficiais consultadas

- [Kie.ai — Generate Music](https://docs.kie.ai/suno-api/generate-music): parâmetros, múltiplas variações, callbacks e retenção de 14 dias.
- [Kie.ai — Suno API](https://kie.ai/suno-api): preço por requisição exibido pelo produto e indicação de uso comercial.
- [Kie.ai — Quickstart](https://docs.kie.ai/suno-api/quickstart): autenticação, tarefa assíncrona, estados e estrutura de faixas retornadas.
- [Kie.ai — Terms of Use](https://kie.ai/terms-of-use): termos gerais, conteúdo do usuário e créditos. Os termos públicos consultados não detalham a licença de revenda do áudio ao cliente final.

## Pendências de implementação

1. Escolher a implementação segura da conta por e-mail e senha na Etapa 3, com senha protegida e recuperação de acesso.
2. Escolher o provedor de pagamento quando a Etapa 7 começar.

Até essas integrações, o protótipo demonstra o fluxo sem persistir conta, realizar cobrança ou gerar música real.

# Auditoria local de prontidão para o piloto

Atualizada em 11/09/2026.

## Resultado executivo

A implementação local possui proteção verificável para os 12 cenários de aceitação do piloto. Essa conclusão é **local e simulada**: combina testes comportamentais sem serviços externos, auditoria das rotas e migrações e revisão visual automatizada em navegador. Ela não substitui a execução das migrações, do Auth e do Storage em um Supabase real, nem uma geração cobrada na Kie.ai ou uma transação do provedor de pagamento.

A Etapa 9 permanece em andamento até existir evidência de um pedido completo de ponta a ponta no ambiente integrado e avaliação humana do áudio em português.

## Matriz dos cenários críticos

| # | Cenário | Situação local | Evidência principal | Validação real pendente |
|---|---|---|---|---|
| 1 | Duplo clique em gerar | Passa em simulação/estrutura | Chave lógica única por pedido e letra; uma única reivindicação de envio | Concorrência contra PostgreSQL e uma tarefa real |
| 2 | Timeout após envio | Passa em simulação | Erro de aceitação desconhecida leva a `reconciling`, sem reenvio automático | Timeout controlado contra sandbox/fornecedor |
| 3 | Dois ajustes simultâneos | Passa em simulação/estrutura | Reserva atômica condicionada a `available`; uma tarefa por ajuste | Duas sessões/abas contra PostgreSQL real |
| 4 | Falha técnica do ajuste | Passa em estrutura | Direito volta a `available`; tentativa e custo permanecem registrados | Falha real ou injetada no pipeline integrado |
| 5 | Callback repetido ou atrasado | Passa em simulação/estrutura | Upsert idempotente e estado terminal sem regressão; HMAC obrigatório | Callbacks reais repetidos e fora de ordem |
| 6 | Áudio completo antes de pagar | Passa em simulação/estrutura | Rota exige pedido pago/entregue e versão exata da seleção | Storage privado e URL assinada reais |
| 7 | Usuário A acessa dados de B | Passa em simulação/estrutura | Filtro explícito por proprietário, RLS e teste com duas identidades | Duas contas reais e políticas aplicadas |
| 8 | Pagamento pendente ou repetido | Passa em simulação/estrutura | Pendente não cria entrega; evento é deduplicado; confirmado não regride | Webhooks e consulta do provedor escolhido |
| 9 | Comprar a original após ouvir o ajuste | Passa em estrutura | Checkout recebe versão pronta explícita; entrega valida a mesma seleção | Compra integrada escolhendo a original |
| 10 | Link temporário da Kie.ai expira | Passa em simulação/estrutura | MP3 é copiado para chave privada própria e URL de origem é removida | Arquivo real salvo antes da expiração |
| 11 | Página do presente preserva privacidade | Passa em estrutura | Não consulta história/letra; token com hash; revogação e `noindex` | Página e áudio com Storage real |
| 12 | Uso no celular durante espera, erro e retorno | Passa localmente | Oito estados foram navegados e capturados em 390 × 844 sem overflow horizontal | Aparelhos reais, leitor de tela e teste humano |

## Revisão responsiva

A jornada demonstrativa foi navegada em navegador Chromium com viewport de 390 × 844 nos estados de início, letra, conta, espera, erro, prévia, pagamento e presente. Todos apresentaram largura do documento igual à largura disponível. O início também foi conferido em 1440 × 1000.

Durante a revisão, o cabeçalho móvel foi compactado, as ocasiões passaram a uma coluna no celular e os componentes de texto e da entrega receberam limites de largura explícitos. Isso eliminou riscos de conteúdo cortado nas telas estreitas.

Evidências preservadas em `evidencias/`: `home-mobile.png`, `letra-mobile.png`, `conta-mobile.png`, `espera-mobile.png`, `erro-mobile.png`, `previa-mobile.png`, `pagamento-mobile.png`, `presente-mobile.png` e `home-desktop.png`.

## Amostra textual local

O verificador cobre nomes com acentos e diferentes formações — João, Vitória, Luís Otávio, Conceição e Tainá —, o campo de pronúncia e os gêneros MPB, Sertanejo, Pagode, Gospel e Pop romântico. Isso comprova que a camada textual aceita a amostra; não comprova a pronúncia ou a qualidade musical do fornecedor.

## Dependências para o ensaio integrado

1. **Supabase de teste:** URL, chave publicável, chave secreta, Auth por e-mail/senha, migrações aplicadas e bucket privado. Validar RLS com duas contas, expiração de sessão, URLs assinadas e revogação.
2. **Kie.ai:** credencial, domínio real de áudio permitido, segredo HMAC, URL HTTPS de callback e orçamento explícito. Executar um pedido e um ajuste controlado, registrar tempo, créditos, faixas e qualidade de nomes/letra.
3. **Pagamento:** escolher o provedor e os meios aceitos; implementar checkout e webhook reais. Validar R$ 19,90 em BRL, pendência, duplicação, falha e confirmação vinculada à versão.
4. **Ambiente publicado de teste:** GitHub e Vercel serão configurados somente na fase final autorizada, com segredos separados de produção.
5. **Qualidade humana:** conferir legibilidade, teclado, leitor de tela e sensação de espera em aparelhos reais; avaliar pronúncia e resultado musical com ouvintes brasileiros.

## Evidência mínima para concluir a Etapa 9

- um pedido completo, com conta, briefing, letra aprovada, geração, prévia, seleção, pagamento, download e página do presente;
- os 12 cenários executados no ambiente integrado, com resultado e data;
- amostras humanas de nomes, letras e estilos brasileiros, incluindo observações de pronúncia;
- tempo de espera, créditos e custo variável observados;
- nenhuma exposição de história, letra ou MP3 completo fora da autorização correta.

Comando local canônico: `npm run verify` dentro de `site`.

# Te Cantei — contrato da integração Kie.ai

Atualizado em 11/09/2026. A integração abaixo está implementada e testada com respostas simuladas; nenhuma chamada real ou consumo de créditos ocorreu.

## Contrato confirmado nas fontes oficiais

- Base da API: `https://api.kie.ai`.
- Criação: `POST /api/v1/generate`, com Bearer token mantido apenas no servidor.
- Consulta: `GET /api/v1/generate/record-info?taskId=...`.
- Modelos aceitos pelo adaptador: `V3_5`, `V4`, `V4_5`, `V4_5PLUS`, `V4_5ALL`, `V5`, `V5_5`, `V6`, `V6_MINI` e `V6_WILD`. O painel administrativo oferece os modelos atuais V6 e mantém V5/V5.5 como opções legadas.
- Modelo padrão reversível do projeto: `V6`. O parâmetro opcional de duração é enviado nos modelos `V5_5`, `V6`, `V6_MINI` e `V6_WILD`.
- Modo usado pelo Te Cantei: personalizado, não instrumental, com letra aprovada, estilo, título e callback HTTPS.
- Limites atuais usados na validação: nos modelos `V3_5` e `V4`, letra com até 3.000 caracteres e estilo com até 200; nos modelos posteriores, até 5.000 e 1.000 respectivamente; título com até 80 em todos.
- Uma solicitação pode produzir múltiplas faixas; todas pertencem à mesma tarefa e ao mesmo pedido.
- Os arquivos do fornecedor têm retenção informada de 14 dias e deverão ser copiados para o Supabase Storage privado antes de expirar.
- Estados consultáveis incluem espera, texto pronto, primeira faixa pronta, sucesso, falha de criação, falha de áudio, erro de conteúdo e falha do callback.

Fontes:

- [Kie.ai — Generate Music](https://docs.kie.ai/suno-api/generate-music)
- [Kie.ai — Get Music Task Details](https://docs.kie.ai/suno-api/get-music-details/)
- [Kie.ai — Music Generation Callbacks](https://docs.kie.ai/suno-api/generate-music-callbacks)
- [Kie.ai — Webhook Security Verification](https://docs.kie.ai/common-api/webhook-verification)

## Comportamento implementado

- O adaptador recebe a chave no construtor e nunca lê nem envia a chave ao cliente do navegador.
- A reserva da geração usa uma chave lógica derivada do pedido e da revisão aprovada. Uma RPC transacional permite que somente um servidor reivindique o envio externo.
- O modo padrão é `mock`, com custo zero. Uma chamada real só fica disponível quando `KIE_GENERATION_MODE=live` e `KIE_LIVE_GENERATION_ENABLED=true` são definidos juntos no servidor.
- O painel `/admin` escolhe o modelo e pode solicitar o modo ao vivo, mas não vence as duas travas do ambiente. A verificação de conexão consulta apenas o saldo de créditos da Kie.ai e não cria uma música.
- A preferência de voz do briefing é enviada no parâmetro `vocalGender` da geração, além de permanecer descrita no estilo musical.
- Falha de rede durante a criação é classificada como resultado desconhecido. O sistema deve conciliar a tarefa antes de qualquer reenvio que possa consumir créditos novamente.
- A consulta normaliza o resultado do fornecedor e aceita várias faixas na mesma tarefa.
- Eventos atrasados não fazem uma tarefa concluída voltar para processamento.
- `CALLBACK_EXCEPTION` e estados desconhecidos entram em conciliação, não em nova geração automática.
- A rota pública `/api/kie/callback` extrai o identificador da tarefa e valida HMAC-SHA256 sobre `taskId.timestamp` antes de usar o cliente administrativo.
- A assinatura é comparada sem interrupção no primeiro byte divergente e callbacks fora da janela de cinco minutos são recusados para reduzir repetição.
- O callback limita o corpo a 128 KiB, aceita somente a estrutura documentada e URLs HTTPS e aplica a alteração em uma transação do PostgreSQL.
- Várias faixas retornadas são persistidas como versões diferentes ligadas à mesma tarefa; callbacks repetidos não duplicam versões nem regridem um estado terminal.
- A cópia para o Supabase Storage aceita somente HTTPS em uma lista explícita de origens, limita o arquivo a 25 MB, valida a assinatura básica de MP3 e usa uma chave privada derivada de IDs internos seguros.
- Após uma cópia bem-sucedida, a URL temporária é removida do banco. A versão permanece em processamento até existir uma prévia própria.
- O processador de prévia percorre quadros MPEG Layer III, rejeita áudio com menos de 2min30 e cria outro MP3 com no máximo 50 segundos.
- O executor interno exige `CRON_SECRET`, reivindica uma saída por vez com `FOR UPDATE SKIP LOCKED`, recupera trabalhos abandonados após dez minutos e limita cada saída a três tentativas.
- Antes de qualquer envio live, uma RPC exclusiva do servidor reserva créditos em limites móveis de 24 horas por conta e por ambiente. Bloqueios transacionais impedem que pedidos simultâneos ultrapassem os tetos; timeout ambíguo mantém a reserva até conciliação.
- A publicação é transacional: a saída só passa a armazenada, a versão só passa a pronta e a validade de 14 dias só começa depois que os objetos completo e de prévia existem no Storage privado.
- O ajuste usa uma nova tarefa musical vinculada à versão de referência. A reserva resiste a cliques concorrentes, preserva a original e só consome o direito quando a nova prévia é publicada.
- Falha técnica conhecida devolve o ajuste; aceitação desconhecida mantém a reserva em conciliação. Uma nova tentativa técnica recebe outra chave lógica e outro registro de custo.

## O que ainda não foi implementado

- agendamento do executor no ambiente Vercel e confirmação das origens CDN reais usadas pela conta Kie.ai;
- avaliação real de como as instruções do ajuste influenciam voz, melodia e arranjo nos modelos contratados;
- validação do corte com um arquivo real devolvido pela Kie.ai e teste editorial do melhor ponto inicial da prévia;
- definição dos valores definitivos dos limites por conta e por ambiente depois de observar o custo real;
- teste real autorizado com chave e créditos.

O teste real deve confirmar modelo contratado, cobrança efetiva por solicitação, quantidade de faixas, qualidade em português, duração, assinatura do callback e comportamento de estorno. Não repetir uma chamada paga quando o resultado da primeira permanecer incerto.

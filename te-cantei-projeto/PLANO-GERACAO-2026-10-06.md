# GPT-6.1 Sol e fidelidade musical

Objetivo: adicionar e selecionar GPT-6.1 Sol pela Kie.ai com raciocínio `high`, alinhando letra e produção ao estilo escolhido.

Arquitetura: preservar o provedor e o endpoint de geração já integrado, documentado pela Kie.ai em sua interface anterior. Compartilhar perfis musicais entre o compositor de letras e as rotas de geração original e ajuste. Preservar letras aprovadas, reservas de orçamento, conciliação e arquivos privados.

Alternativas avaliadas: apenas mudar o modelo não corrige o direcionamento musical; uma nova integração direta com OpenAI exigiria outra credencial e não resolve o arranjo. A integração existente com perfis compartilhados atende à solicitação com menor impacto.

## Execução

- [x] Reproduzir em testes a ausência do modelo, dos perfis musicais e dos controles de estilo.
- [x] Adicionar o identificador Kie.ai `gpt-6-1-sol` ao registro, painel, preflight e restrição PostgreSQL. Configurar o modelo e `high` na migração sem ativar novas portas de geração paga.
- [x] Definir perfis para todos os estilos existentes, com condução rítmica, instrumentos, interpretação e orientação de escrita. Estilos livres preservam o texto informado.
- [x] Enviar `styleWeight: 0.9`, `weirdnessConstraint: 0.3`, `variety: 0` e exclusões pertinentes. Estes valores são uma escolha inicial do produto, a calibrar com escuta, não garantia do fornecedor.
- [x] Preservar literalmente a letra aprovada no campo de letra e validar limites antes do envio. Manter duração desejada em 180 segundos.
- [x] Separar instruções do compositor dos dados do cliente; adequar métrica, refrão e estrutura ao gênero e limitar a resposta a 5.000 caracteres.
- [x] Aceitar JSON e SSE concluídos; rejeitar respostas incompletas ou falhas, inclusive eventos aninhados de Responses. Dar tempo suficiente ao raciocínio alto.
- [x] Validar contrato HTTP, estilos, voz, limites, respostas e uso nas duas rotas. Executar suíte existente, lint, TypeScript e build.
- [x] Rejeitar notas acima da capacidade efetiva antes da reserva do ajuste, mantendo instruções aceitas completas e informando o limite ao cliente.
- [x] Atualizar ESTADO.md com resultado real e dependências de banco, publicação e avaliação auditiva.

Fontes consultadas em 06/10/2026: https://developers.openai.com/api/docs/models/gpt-6.1-sol ; https://docs.kie.ai/market/chat/gpt-6-1-sol ; https://docs.kie.ai/old-model/suno-api/generate-music . A documentação OpenAI usa `gpt-6.1-sol`; o gateway Kie.ai usa `gpt-6-1-sol`.

Conclusão técnica depende de testes locais. A qualidade musical final depende de uma geração autorizada e avaliação auditiva. Não repetir automaticamente uma criação paga ambígua.

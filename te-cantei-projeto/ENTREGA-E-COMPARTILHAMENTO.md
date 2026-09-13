# Te Cantei — entrega e compartilhamento

Atualizado em 11/09/2026. A implementação está pronta localmente e permanece sem arquivos ou projetos externos reais.

## Área do comprador

- A música completa só é liberada quando existe uma entrega criada pela confirmação do pagamento no servidor.
- A entrega referencia a mesma versão persistida na seleção e na intenção de pagamento.
- O download usa uma URL assinada do Supabase Storage válida por 60 segundos e nunca expõe a chave secreta.
- O primeiro acesso registra a entrega sem alterar a seleção ou gerar outra música.

## Página do presente

- O comprador escreve uma dedicatória de até 500 caracteres.
- Cada criação ou rotação usa um token aleatório de 256 bits; o banco armazena somente seu hash SHA-256.
- Criar um novo link invalida o anterior.
- Revogar o link bloqueia a página e o áudio imediatamente na próxima requisição.
- A página permite ouvir a música completa porque o próprio link representa a autorização concedida pelo comprador.
- A página não consulta nem apresenta história, briefing, pronúncia, letra, e-mail ou dados de pagamento.
- A página e a rota de áudio solicitam não indexação por mecanismos de busca.

## Limites conscientes

- Quem recebe acesso ao áudio no navegador pode tecnicamente capturá-lo; o link controla acesso, não DRM.
- O token bruto é mostrado ao comprador somente quando um novo link é criado. Depois de recarregar, é necessário gerar outro link para copiá-lo novamente.
- QR code, capa personalizada e envio automático por WhatsApp ou e-mail continuam opcionais e não foram implementados.

## Validação pendente

- aplicar as migrações no Supabase de teste;
- confirmar URLs assinadas e revogação com arquivos reais;
- revisar a página em celular e computador;
- testar o caminho completo com duas contas e um navegador anônimo.

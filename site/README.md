# Te Cantei

Aplicação Next.js para transformar uma história pessoal em uma música de presente. A arquitetura final usa Supabase para autenticação, PostgreSQL e Storage privado, Vercel para hospedagem e GitHub para o repositório.

## Desenvolvimento local

Requisitos: Node.js 22 ou mais recente.

```powershell
Copy-Item .env.example .env.local
npm run dev
```

Sem credenciais Supabase, o fluxo visual continua em modo demonstrativo e nenhuma senha é armazenada. Para autenticação real, preencha em `.env.local` somente valores de um ambiente de desenvolvimento.

## Banco e segurança

A migração canônica está em `supabase/migrations/202609110001_initial.sql`. Ela cria as 13 tabelas do domínio, ativa Row Level Security, fecha privilégios anônimos, cria a reserva atômica do único ajuste e mantém o bucket `te-cantei-audio` privado.

Os arquivos em `db/`, `drizzle/` e parte de `lib/data/` são a implementação D1 anterior. Permanecem temporariamente como teste de comportamento durante a migração dos repositórios para PostgreSQL; não são o destino de produção.

## Verificação

```powershell
npm run verify
```

`db:verify` executa os testes comportamentais locais e a auditoria estrutural da migração Supabase. A validação real de RLS, autenticação e Storage depende de um projeto Supabase de teste e será feita antes da publicação.

## Publicação

A publicação foi deliberadamente adiada. Quando todas as etapas locais estiverem prontas, o projeto será versionado no GitHub, ligado a um projeto Supabase e implantado na Vercel com variáveis separadas para Preview e Production.

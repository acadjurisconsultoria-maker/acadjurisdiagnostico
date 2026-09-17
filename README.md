# Sistema Diagnóstico AcadJuris — Ciclo 0 (fundação técnica)

Implementação do **Ciclo 0** de `Docs/analise-tecnica/Plano-de-Implementacao-por-Ciclos-v1.md`:
autenticação, segregação multiempresa e o esqueleto de dados sobre o qual os
próximos ciclos (catálogo, questionário, análise, aprovação, controle de
horas) serão construídos.

**Este projeto ainda não foi implantado em lugar nenhum.** Não há
repositório remoto nem projeto Vercel associados. Existe um projeto
Supabase de **desenvolvimento** real, `acadjuris-diagnostico-dev` (região
`sa-east-1`), criado via conector Supabase (MCP) sob autorização específica
— nunca um projeto de produção, nenhum dado real. As migrations `0001` a
`0005` já foram aplicadas nele (ver `docs/adr/0001-fundacao-tecnica-ciclo-0.md`,
decisão 13). Falta apenas: preencher `SUPABASE_SECRET_KEY` real em
`app/.env.local` (o conector não tem acesso a esse valor — só o painel
Supabase o exibe) para rodar o seed e os testes de integração (decisão 14).

---

## Stack

Next.js (App Router) + TypeScript + Supabase (Postgres, Auth, Storage) —
conforme `Docs/analise-tecnica/Plano-de-Arquitetura-Tecnica-v1.md`. Sem
GraphQL, sem microsserviços, sem provedor de IA (decisão de produto).

## Pré-requisitos

- Node.js 20+ e npm.
- O projeto Supabase de **desenvolvimento** já existe (`acadjuris-diagnostico-dev`,
  ver acima) e já tem as migrations `0001`–`0005` aplicadas. Falta apenas a
  `SUPABASE_SECRET_KEY` real em `.env.local` — ver "Pendências de
  configuração externa" abaixo.
- Supabase CLI (`npx supabase`, já resolvido via `npx` — não precisa
  instalar globalmente) — necessário apenas para o seed local; migrations e
  tipos já foram aplicados/gerados via conector nesta rodada.

## Instalação

```bash
npm install
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY já estao
# preenchidos com os valores reais de acadjuris-diagnostico-dev. Falta
# apenas SUPABASE_SECRET_KEY (Project Settings -> API -> secret keys no
# painel Supabase -- o conector MCP nao tem acesso a esse valor). Padrao
# atual de chaves (publishable/secret) -- nao as chaves legadas
# (anon/service_role). Nunca um projeto de producao.
```

## Banco de dados

As migrations `0001` a `0005` já foram aplicadas em
`acadjuris-diagnostico-dev` via conector Supabase (MCP) — não é necessário
rodar `supabase db push` para o estado atual. Para reaplicar do zero em
outro projeto, ou depois de criar uma nova migration:

```bash
npx supabase login                          # autoriza o CLI (abre o navegador)
npx supabase link --project-ref <ref>       # vincula ao projeto Supabase de desenvolvimento
npx supabase db push                        # aplica supabase/migrations/*.sql
node --env-file=.env.local supabase/seed/seed-fictitious.mjs   # cria 2 organizações fictícias + 9 usuários de teste (exige SUPABASE_SECRET_KEY real)
npx supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

## Rodando a aplicação

```bash
npm run dev
```

Abra `http://localhost:3000`. Faça login com um dos usuários criados pelo
seed (ex.: `consultor.a@teste.acadjuris.local`, senha `SenhaTeste!2026`).
Perfis internos (Super Admin, Admin AcadJuris, Consultor Responsável,
Analista/Auditor) são obrigados a cadastrar autenticação em duas etapas
(TOTP) no primeiro login.

## Qualidade

```bash
npm run lint        # ESLint
npm run typecheck    # tsc --noEmit
npm run test         # Vitest (testes unitários -- não exigem Supabase)
npm run build        # build de produção do Next.js
npm run check         # roda os 4 acima em sequência
npm run test:integration   # testes reais de RLS/auth/MFA/auditoria (exige projeto Supabase vinculado + seed)
```

Os testes de integração (`tests/integration/`) **exigem** um projeto
Supabase de desenvolvimento real, vinculado e semeado — não rodam com
`npm test`/`npm run check`. Ver
`tests/integration/README.md`.

## Estrutura do projeto

```
src/
  app/
    login/                  autenticação (e-mail/senha + MFA)
      mfa/                  desafio MFA (usuário já cadastrado)
      mfa/enroll/           cadastro de MFA (obrigatório p/ perfis internos)
    consultor/               landing mínima do Painel do Consultor
    cliente/                 landing mínima do Painel da Cliente
    sem-acesso/               usuário autenticado sem nenhum vínculo
  lib/
    env.ts                   validação central de variáveis de ambiente
    audit.ts                 registro de eventos de auditoria (sem dado sensível)
    auth/
      perfis.ts               lógica pura de cálculo de perfil efetivo (testável)
      session.ts               leitura da sessão + grants (usa Supabase)
    supabase/
      client.ts                cliente para Client Components (navegador)
      server.ts                 cliente para Server Components/Actions (com RLS)
      admin.ts                  cliente privilegiado de servidor (ignora RLS -- só via authorizeAdminOperation(), perfil sempre derivado da sessão real)
      database.types.ts         tipos do schema (regenerados a partir do projeto Supabase vinculado)
  proxy.ts                    renovação de sessão + proteção de rota (camada de UX; antigo "middleware", convenção Next.js 16)
supabase/
  migrations/                 schema + RLS (SQL, aplicado em ordem)
  seed/                       dados fictícios para teste de segregação
tests/
  unit/                       testes sem dependência externa (rodam sempre)
  integration/                testes de RLS (exigem Supabase local)
docs/
  adr/                         registro de decisões técnicas deste ciclo
```

## Segurança (resumo — detalhe completo nos ADRs e em `Docs/analise-tecnica/`)

- RLS habilitado em toda tabela desde a primeira migration (nunca "adicionar depois").
- 3 clientes Supabase distintos — o cliente privilegiado (`admin.ts`, secret
  key) nunca é importado por código que roda no navegador (`server-only`
  faz o build falhar se isso acontecer) e só é obtido via
  `authorizeAdminOperation(operation)`, que deriva o perfil autorizado da
  sessão real (nunca de um parâmetro) e recusa qualquer operação fora de
  uma lista fechada (nenhum uso silencioso, nenhum perfil falsificável).
- Padrão atual de chaves do Supabase (publishable/secret) — não as chaves
  legadas (anon/service_role).
- Nenhum segredo em código — apenas `process.env`, validado por `src/lib/env.ts`.
- `.env.example` contém somente nomes de variáveis; `.env*` real está no
  `.gitignore`.
- Nenhum dado real de cliente em nenhum ambiente que não seja produção —
  `APP_ENV` (não confundir com `NODE_ENV`) identifica o ambiente lógico.
- `src/lib/audit.ts` recusa registrar campos com nome de dado pessoal
  (verificação best-effort, não substitui revisão de código).

## Pendências de configuração externa (não bloqueiam o código, bloqueiam a execução)

1. **`SUPABASE_SECRET_KEY` real** — o projeto Supabase de desenvolvimento
   (`acadjuris-diagnostico-dev`) já existe e já está com as migrations
   aplicadas, mas o conector Supabase (MCP) não tem acesso à secret key —
   só o painel Supabase a exibe (Project Settings → API → secret keys).
   Enquanto `app/.env.local` não tiver o valor real, o seed
   (`seed-fictitious.mjs`) e toda a suíte `tests/integration/**` (login,
   MFA, RLS, aprovação jurídica, auditoria, segregação A/B) não podem ser
   executados de ponta a ponta — ver `docs/adr/0001-fundacao-tecnica-ciclo-0.md`,
   decisão 14.
2. **Repositório GitHub remoto** — não criado nesta rodada; o repositório
   Git é local (ver `git log`).
3. **Provedor de verificação de arquivo malicioso** — não definido (`Politicas-RLS-e-Storage-Especificacao-v1.md`, seção 7) — relevante a partir do Ciclo 3.

## Próximo ciclo

Ciclo 1 — Catálogo e cadastro de projeto (ver `Docs/analise-tecnica/Plano-de-Implementacao-por-Ciclos-v1.md`). Não iniciado nesta rodada.

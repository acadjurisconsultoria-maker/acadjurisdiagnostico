# Sistema Diagnóstico AcadJuris — Ciclo 0 (fundação técnica)

Implementação do **Ciclo 0** de `Docs/analise-tecnica/Plano-de-Implementacao-por-Ciclos-v1.md`:
autenticação, segregação multiempresa e o esqueleto de dados sobre o qual os
próximos ciclos (catálogo, questionário, análise, aprovação, controle de
horas) serão construídos.

**Este projeto ainda não foi implantado em lugar nenhum.** Não há
repositório remoto, projeto Supabase ou projeto Vercel associados. Todas as
instruções abaixo assumem um ambiente Supabase **local**.

---

## Stack

Next.js (App Router) + TypeScript + Supabase (Postgres, Auth, Storage) —
conforme `Docs/analise-tecnica/Plano-de-Arquitetura-Tecnica-v1.md`. Sem
GraphQL, sem microsserviços, sem provedor de IA (decisão de produto).

## Pré-requisitos

- Node.js 20+ e npm.
- Um projeto Supabase de **desenvolvimento** (nunca produção), criado no
  painel Supabase — ver seção "Pendências de configuração externa" abaixo.
- Supabase CLI (`npx supabase`, já resolvido via `npx` — não precisa
  instalar globalmente).

## Instalação

```bash
npm install
cp .env.example .env.local
# preencha .env.local com os valores do projeto Supabase de DESENVOLVIMENTO
# (Project Settings → API no painel Supabase). Padrao atual de chaves
# (publishable/secret) -- nao as chaves legadas (anon/service_role). Nunca
# um projeto de producao.
```

## Banco de dados

```bash
npx supabase login                          # autoriza o CLI (abre o navegador)
npx supabase link --project-ref <ref>       # vincula ao projeto Supabase de desenvolvimento
npx supabase db push                        # aplica supabase/migrations/*.sql
node supabase/seed/seed-fictitious.mjs      # cria 2 organizações fictícias + 5 perfis de teste
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
```

Os testes de integração de RLS (`tests/integration/`) **exigem** uma
instância Supabase local em execução — não rodam com `npm test`. Ver
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
      admin.ts                  cliente privilegiado de servidor (ignora RLS -- uso restrito, exige autorização de perfil+operação)
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
  faz o build falhar se isso acontecer) e exige perfil + operação
  declarados antes de ser instanciado (nenhum uso silencioso).
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

1. **Projeto Supabase de desenvolvimento** — aguardando criação pela AcadJuris
   no painel Supabase, e vinculação via `npx supabase login` / `link`
   (nenhuma conta ou serviço externo é provisionado sem autorização
   específica). Enquanto isso, o login real, o MFA real e os testes de
   RLS reais não podem ser executados de ponta a ponta.
2. **Repositório GitHub remoto** — não criado nesta rodada; o repositório
   Git é local (ver `git log`).
3. **Provedor de verificação de arquivo malicioso** — não definido (`Politicas-RLS-e-Storage-Especificacao-v1.md`, seção 7) — relevante a partir do Ciclo 3.

## Próximo ciclo

Ciclo 1 — Catálogo e cadastro de projeto (ver `Docs/analise-tecnica/Plano-de-Implementacao-por-Ciclos-v1.md`). Não iniciado nesta rodada.

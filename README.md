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
- Docker (para rodar o Supabase localmente via `supabase start`). **Não
  disponível no ambiente em que o Ciclo 0 foi escrito** — ver seção
  "Pendências de configuração externa" abaixo.
- Supabase CLI (`npx supabase`, já resolvido via `npx` — não precisa
  instalar globalmente).

## Instalação

```bash
npm install
cp .env.example .env.local
# preencha .env.local com os valores impressos por `npx supabase start`
# (URL e chave anônima do projeto LOCAL -- nunca um projeto remoto)
```

## Banco de dados local

```bash
npx supabase init        # primeira vez apenas -- gera supabase/config.toml
npx supabase start       # sobe Postgres + Auth + Storage localmente (exige Docker)
npx supabase db reset    # aplica supabase/migrations/*.sql
node supabase/seed/seed-fictitious.mjs   # cria 2 organizações fictícias + 5 perfis de teste
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
      service-role.ts           cliente privilegiado (ignora RLS -- uso restrito)
      database.types.ts         tipos do schema (gerados manualmente, ver arquivo)
  middleware.ts               renovação de sessão + proteção de rota (camada de UX)
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
- 3 clientes Supabase distintos — o de `service_role` nunca é importado por
  código que roda no navegador (`server-only` faz o build falhar se isso
  acontecer).
- Nenhum segredo em código — apenas `process.env`, validado por `src/lib/env.ts`.
- `.env.example` contém somente nomes de variáveis; `.env*` real está no
  `.gitignore`.
- Nenhum dado real de cliente em nenhum ambiente que não seja produção —
  `APP_ENV` (não confundir com `NODE_ENV`) identifica o ambiente lógico.
- `src/lib/audit.ts` recusa registrar campos com nome de dado pessoal
  (verificação best-effort, não substitui revisão de código).

## Pendências de configuração externa (não bloqueiam o código, bloqueiam a execução)

1. **Docker** — indisponível no ambiente em que este ciclo foi escrito;
   necessário para `supabase start` (banco local) e, portanto, para rodar a
   aplicação de ponta a ponta e os testes de integração.
2. **Projeto Supabase remoto** (dev/preview/produção) — não criado nesta
   rodada, por instrução expressa (nenhuma conta ou serviço externo é
   provisionado sem autorização específica).
3. **Repositório GitHub remoto** — não criado nesta rodada; o repositório
   Git é local (ver `git log`).
4. **Provedor de verificação de arquivo malicioso** — não definido (`Politicas-RLS-e-Storage-Especificacao-v1.md`, seção 7) — relevante a partir do Ciclo 3.

## Próximo ciclo

Ciclo 1 — Catálogo e cadastro de projeto (ver `Docs/analise-tecnica/Plano-de-Implementacao-por-Ciclos-v1.md`). Não iniciado nesta rodada.

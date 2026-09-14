# Dependências e finalidades (Ciclo 0)

Lista completa das dependências de `package.json`, com a finalidade de cada
uma — nenhuma dependência é incluída sem justificativa concreta para o
Ciclo 0 (reforço de "manter dependências mínimas e atualizadas").

## Dependências de produção

| Pacote | Finalidade |
|---|---|
| `next` | Framework da aplicação (App Router) — stack obrigatória. |
| `react`, `react-dom` | Exigidos pelo Next.js. |
| `@supabase/supabase-js` | Cliente Supabase (Postgres/Auth/Storage) — stack obrigatória. |
| `@supabase/ssr` | Adaptação do cliente Supabase para Server Components/Server Actions/Middleware do Next.js (cookies de sessão). |
| `zod` | Validação das variáveis de ambiente em `src/lib/env.ts` — falha rápido e claro se um segredo/URL obrigatório estiver ausente ou malformado. |
| `server-only` | Marca módulos que nunca podem ser importados por código do navegador (`src/lib/supabase/server.ts`, `admin.ts`, `src/lib/audit.ts`) — o build falha se isso acontecer. |

## Dependências de desenvolvimento

| Pacote | Finalidade |
|---|---|
| `typescript` | Checagem de tipos estática. |
| `@types/node`, `@types/react`, `@types/react-dom` | Tipos para as APIs de Node.js e React. |
| `eslint`, `eslint-config-next`, `@eslint/eslintrc` | Lint (regras do Next.js + regra própria contra `console.log` de dado sensível). |
| `vitest` | Executor de testes unitários e de integração. |

## O que foi deliberadamente NÃO incluído

- **Framework de UI/CSS** (Tailwind, componentes prontos) — Ciclo 0 não tem
  requisito de design; adicionar antes de haver telas de produto reais
  seria antecipação sem necessidade concreta.
- **ts-node/tsx** — o único script fora do Next.js (`supabase/seed/seed-fictitious.mjs`)
  é JavaScript puro, não precisa de um executor de TypeScript.
- **Biblioteca de geração de PDF/DOCX** — só entra na Fase de Entrega
  (Ciclo 6+), conforme já registrado em `Plano-de-Arquitetura-Tecnica-v1.md`, seção 5.
- **Qualquer SDK de IA** — decisão de produto (não usar IA no MVP).

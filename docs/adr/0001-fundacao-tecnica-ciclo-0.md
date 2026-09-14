# ADR 0001 — Fundação Técnica (Ciclo 0)

Data: 2026-09-14
Status: Aceito

## Contexto

Autorização para implementar exclusivamente o Ciclo 0 de
`Docs/analise-tecnica/Plano-de-Implementacao-por-Ciclos-v1.md`: repositório
local, Next.js + Supabase, autenticação com MFA para perfis internos,
schema inicial com RLS, sem criar conta/repositório remoto/projeto Supabase
ou Vercel.

## Decisões

### 1. Nomenclatura de schema em inglês (`organization_id`, `company_id`, `unit_id`, `project_id`)

`Docs/analise-tecnica/Plano-de-Arquitetura-Tecnica-v1.md` (o plano técnico
original) usa nomes em português (`organizacao_id`, `empresa_id`, etc.). A
rodada de segurança posterior (`Docs/analise-tecnica/Modelo-de-Seguranca-
Multitenant-e-Segregacao-de-Dados-v1.md`) fixou explicitamente os nomes em
inglês como requisito obrigatório. **Decisão: seguir a nomenclatura em
inglês**, por ser mais recente e mais específica — aplicada de forma
consistente a tabelas e colunas em todo o schema.

### 2. Perfil como tabela de vínculo, não como claim fixo do JWT

Reafirma `Plano-de-Arquitetura-Tecnica-v1.md`, seção 3.1: perfil e escopo de
acesso vivem em tabelas (`super_admin_grant`, `admin_acadjuris_grant`,
`staff_project_access`, `client_access`), nunca em um claim estático do
token. Revogar acesso é sempre um `UPDATE`/`DELETE`, com efeito imediato em
toda policy de RLS — sem depender de expiração/reemissão de token.

### 3. Três clientes Supabase distintos, nunca um só

`src/lib/supabase/client.ts` (navegador, chave anônima),
`src/lib/supabase/server.ts` (servidor, chave anônima + cookie de sessão,
respeitando RLS), `src/lib/supabase/service-role.ts` (servidor, ignora RLS,
uso restrito). Os dois últimos importam `server-only`, que falha o build se
importados por engano em um Client Component.

### 4. MFA via TOTP nativo do Supabase Auth, sem biblioteca adicional

`supabase.auth.mfa.*` (enroll/challenge/verify) cobre o fluxo completo sem
exigir um provedor externo de MFA. Fatores TOTP não verificados de
tentativas anteriores são removidos automaticamente antes de gerar um novo
QR code, evitando acúmulo de fatores órfãos.

### 5. Testes de RLS como suíte de integração separada, documentada como pendente de Docker

Este ambiente de desenvolvimento não tem Docker disponível, e o Supabase
CLI depende de Docker para rodar Postgres localmente. **Decisão:** escrever
o schema, as policies, o seed e os testes de integração completos, mas
excluir `tests/integration/**` da execução padrão de `npm test` (que roda
apenas testes unitários, sem dependência externa) — ver
`tests/integration/README.md` para o roteiro de execução quando Docker
estiver disponível. Isso significa que o critério de saída do Ciclo 0
("teste de duas organizações fictícias já passa") está **implementado, mas
não executado** nesta rodada — reportado explicitamente, não maquiado.

### 6. Sem framework de UI/CSS

Apenas CSS puro (`globals.css`), sem Tailwind ou biblioteca de componentes.
Justificativa: o Ciclo 0 é fundação técnica (auth + schema), não tem
requisito de design; adicionar uma dependência de UI antes de haver telas
reais de produto seria antecipação sem necessidade concreta ainda
(reforça `manter dependências mínimas`).

### 7. ESLint flat config importado diretamente de `eslint-config-next`, sem `FlatCompat`

`eslint-config-next@16` já exporta um array de flat config nativo
(`eslint-config-next/core-web-vitals`), não o formato legado `.eslintrc`.
Usar `FlatCompat` (ponte para configs antigas) contra um export já-flat
causa `TypeError: Converting circular structure to JSON` (o plugin React é
serializado dentro do próprio objeto de config, e `FlatCompat` tenta
tratá-lo como JSON). **Decisão:** importar o array diretamente
(`import nextCoreWebVitals from "eslint-config-next/core-web-vitals"`).

### 8. TypeScript fixado em 6.0.3, não na última versão (7.0.2)

O `npm view typescript version` mais recente no momento era `7.0.2` (o novo
port nativo do compilador). **Decisão: fixar `6.0.3`** — `typescript-eslint`
(dependência de `eslint-config-next`) declara suporte apenas a
`>=4.8.4 <6.1.0`; rodar com TS 7 quebra o lint por completo
(`typescript-eslint does not support TS 7.0`). Reavaliar quando o
ecossistema de lint suportar TS 7.

### 9. ESLint fixado em 9.39.5, não na última versão (10.10.0)

Com ESLint `10.10.0`, o lint falhava com `TypeError: scopeManager.addGlobals
is not a function` -- incompatibilidade interna entre a API de `Linter` da
versão 10 e `typescript-eslint@^8.46` (dependência de `eslint-config-next`,
ainda não atualizada para ESLint 10 no momento desta rodada). **Decisão:**
fixar `9.39.5` (última 9.x estável), dentro do range que `eslint-config-next`
declara suportar (`>=9.0.0`) e que `typescript-eslint@8.x` de fato testa.
Reavaliar quando `eslint-config-next`/`typescript-eslint` publicarem suporte
declarado a ESLint 10.

### 10. Sem ts-node/tsx para o script de seed

`supabase/seed/seed-fictitious.mjs` é escrito em JavaScript puro (ESM), não
TypeScript, para não exigir um executor de TypeScript adicional como
dependência apenas para um script standalone que roda fora do Next.js.

## Consequências

- Todo o código de autenticação/RLS está pronto para uso assim que houver
  uma instância Supabase (local ou remota) disponível — nenhuma refatoração
  estrutural esperada, apenas execução e ajuste fino.
- `src/lib/supabase/database.types.ts` foi escrito manualmente a partir das
  migrations (não gerado por `supabase gen types`, que exige instância em
  execução) — deve ser regenerado e revisado quando o Supabase local
  estiver disponível.
- O critério de saída "login funcional para os 5 perfis" só pode ser
  confirmado de fato após a pendência de Docker ser resolvida.

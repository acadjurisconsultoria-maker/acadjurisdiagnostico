# Testes de integração

Os testes deste diretório exigem um projeto Supabase de **desenvolvimento**
real (Postgres, com as migrations e as policies de RLS aplicadas, e o seed
de dados fictícios executado) — não rodam contra mocks.

## Arquivos

- `env.ts` — carrega `app/.env.local` (via `process.loadEnvFile`, nunca imprime valores) e expõe getters que falham com mensagem clara se uma variável estiver ausente.
- `helpers.ts` — clientes reutilizáveis (anônimo/publishable, privilegiado/secret) e login dos usuários fictícios do seed.
- `rls-segregation.test.ts` — matriz completa de segregação entre as organizações fictícias A e B (SELECT/INSERT/UPDATE/DELETE, empresa/unidade/projeto, falsificação de `organization_id`/perfil/operação administrativa), nos dois sentidos.
- `auth-and-mfa.test.ts` — login real e MFA real (enroll → challenge → verify) usando um gerador de TOTP próprio (`src/lib/mfa/totp.ts`), sem intervenção humana.
- `audit-trail.test.ts` — RLS real da trilha de auditoria (escrita em nome próprio, recusa de escrita em nome de terceiro, imutabilidade).

## Como executar

```bash
# 1. Garantir que o projeto está vinculado e as migrations aplicadas
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push

# 2. Popular com as duas organizações fictícias + 9 usuários de teste
node --env-file=.env.local supabase/seed/seed-fictitious.mjs

# 3. Rodar os testes de integração
npm run test:integration
```

As variáveis usadas (`SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`) vêm de `app/.env.local` — padrão atual de chaves do
Supabase, nunca as chaves legadas (anon/service_role). Nunca um projeto de
produção; o próprio código se recusa a rodar com `APP_ENV=production`.

## Reexecução

Os testes de MFA removem os fatores que criam ao final (`unenroll`). Os
testes de segregação e auditoria apenas leem/tentam escrever — não deixam
estado residual que impeça reexecução. O seed (`seed-fictitious.mjs`) não é
idempotente — rodá-lo duas vezes duplica organizações fictícias; se
precisar recriar do zero, limpe os dados fictícios antes (fora do escopo
deste gate) ou use um projeto de desenvolvimento limpo.

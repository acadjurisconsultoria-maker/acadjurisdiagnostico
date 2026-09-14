# Testes de integração

Os testes deste diretório exigem um projeto Supabase de **desenvolvimento**
real (Postgres, com as migrations e as policies de RLS aplicadas) — não
rodam contra mocks, porque o próprio objetivo é validar que o Postgres
recusa acesso cruzado entre organizações.

## Pendência de configuração externa (Ciclo 0)

Estes testes foram escritos e revisados, mas **não foram executados**
enquanto não houver um projeto Supabase de desenvolvimento vinculado — ver
o relatório de entrega do Ciclo 0 para a confirmação explícita dessa
lacuna, e `docs/adr/0001-fundacao-tecnica-ciclo-0.md` para o histórico.

## Como executar (após o projeto de desenvolvimento estar configurado)

```bash
# 1. Vincular o Supabase CLI ao projeto de desenvolvimento
npx supabase login
npx supabase link --project-ref <ref>

# 2. Aplicar as migrations
npx supabase db push

# 3. Popular com as duas organizações fictícias
node supabase/seed/seed-fictitious.mjs

# 4. Rodar os testes de integração
npx vitest run tests/integration
```

As variáveis `NEXT_PUBLIC_SUPABASE_URL` e
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (painel Supabase → Project Settings
→ API) devem estar em `.env.local` — padrão atual de chaves do Supabase,
nunca as chaves legadas (anon/service_role). Nunca um projeto de produção.

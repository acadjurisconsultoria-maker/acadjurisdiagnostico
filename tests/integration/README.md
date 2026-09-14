# Testes de integração

Os testes deste diretório exigem uma instância Supabase **local** em
execução (Postgres real, com as migrations e as policies de RLS
aplicadas) — não rodam contra mocks, porque o próprio objetivo é validar
que o Postgres recusa acesso cruzado entre organizações.

## Pendência de configuração externa (Ciclo 0)

**Este ambiente de desenvolvimento não tem Docker disponível**, e o
Supabase CLI (`supabase start`) depende de Docker para subir Postgres +
Auth + Storage localmente. Por isso, estes testes foram escritos e
revisados, mas **não foram executados** nesta rodada — ver o relatório de
entrega do Ciclo 0 para a confirmação explícita dessa lacuna.

## Como executar (quando Docker estiver disponível)

```bash
# 1. Subir a instância local
npx supabase init      # primeira vez apenas
npx supabase start

# 2. Aplicar as migrations
npx supabase db reset

# 3. Popular com as duas organizações fictícias
node supabase/seed/seed-fictitious.mjs

# 4. Rodar os testes de integração
npx vitest run tests/integration
```

As variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
impressas por `supabase start` devem estar no `.env.local` (ambiente de
desenvolvimento local, nunca um projeto remoto).

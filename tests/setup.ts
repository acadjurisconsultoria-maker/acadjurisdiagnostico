/**
 * Valores padrao de ambiente para a suite de testes unitarios -- nunca
 * reais, apenas o suficiente para que modulos que importam src/lib/env.ts
 * carreguem sem erro quando o teste nao esta especificamente validando a
 * propria validacao de ambiente (essa validacao tem sua suite dedicada em
 * tests/unit/env.test.ts, que sobrescreve estes valores por teste).
 */
process.env["NEXT_PUBLIC_SUPABASE_URL"] ??= "https://exemplo-projeto.supabase.co";
process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ??= "chave-publishable-de-teste";
process.env["SUPABASE_URL"] ??= "https://exemplo-projeto.supabase.co";
process.env["SUPABASE_SECRET_KEY"] ??= "chave-secret-de-teste";
process.env["APP_ENV"] ??= "development";

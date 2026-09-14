import { z } from "zod";

/**
 * Validacao central de variaveis de ambiente.
 *
 * Usa o padrao atual de chaves do Supabase (publishable/secret) -- nao as
 * chaves legadas (anon/service_role). Ver docs/adr/0001-fundacao-tecnica-
 * ciclo-0.md para o historico dessa decisao.
 *
 * Nunca faca console.log dos valores retornados por este modulo -- eles
 * incluem `SUPABASE_SECRET_KEY` em `serverEnv`.
 *
 * `clientEnv` contem apenas variaveis seguras para o navegador (prefixo
 * NEXT_PUBLIC_). `serverEnv` so deve ser importado por codigo que roda
 * exclusivamente no servidor (Server Actions, Route Handlers) -- nunca por
 * um Client Component.
 */

const appEnvSchema = z.enum(["development", "preview", "production"]);

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: "NEXT_PUBLIC_SUPABASE_URL ausente ou invalida. Veja .env.example.",
  }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1, {
    message: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausente. Veja .env.example.",
  }),
});

const serverOnlyEnvSchema = z.object({
  SUPABASE_URL: z.string().url({
    message: "SUPABASE_URL ausente ou invalida. Veja .env.example.",
  }),
  SUPABASE_SECRET_KEY: z.string().min(1, {
    message: "SUPABASE_SECRET_KEY ausente. Veja .env.example.",
  }),
  APP_ENV: appEnvSchema.default("development"),
});

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Configuracao invalida (${label}). Corrija as variaveis de ambiente:\n${problems}`,
    );
  }
  return result.data;
}

/**
 * Variaveis seguras para uso em Client Components.
 *
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY substitui a antiga "anon key" --
 * mesma finalidade (chave publica, segura para o navegador; o acesso real
 * aos dados continua sendo controlado por RLS), nomenclatura atual do
 * Supabase.
 */
export const clientEnv = parseOrThrow(
  clientEnvSchema,
  {
    NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
  },
  "clientEnv",
);

/**
 * Variaveis restritas ao servidor. IMPORTAR SOMENTE em arquivos que nunca
 * sao enviados ao navegador (sem "use client" na cadeia de import).
 *
 * `SUPABASE_URL` e o mesmo valor de `NEXT_PUBLIC_SUPABASE_URL` (a URL do
 * projeto nao e sensivel), mas mantido como variavel propria para que
 * nenhum codigo de servidor dependa, mesmo que por acidente, do nome
 * prefixado com NEXT_PUBLIC_ -- disciplina de nomenclatura, nao segredo.
 *
 * `SUPABASE_SECRET_KEY` substitui a antiga "service_role key" -- opera com
 * privilegios elevados e IGNORA Row Level Security por completo. Nunca
 * aparece no navegador, no bundle, em log, em teste, em build, em commit,
 * em URL ou em mensagem de erro (ver src/lib/supabase/admin.ts).
 */
export const serverEnv = parseOrThrow(
  serverOnlyEnvSchema,
  {
    SUPABASE_URL: process.env["SUPABASE_URL"],
    SUPABASE_SECRET_KEY: process.env["SUPABASE_SECRET_KEY"],
    APP_ENV: process.env["APP_ENV"],
  },
  "serverEnv",
);

/** Verdadeiro apenas no ambiente logico de producao (nunca dev/preview). */
export const isProductionEnvironment = serverEnv.APP_ENV === "production";

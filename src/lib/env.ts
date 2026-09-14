import { z } from "zod";

/**
 * Validacao central de variaveis de ambiente.
 *
 * Nunca faca console.log dos valores retornados por este modulo -- eles
 * incluem a chave service_role em `serverEnv`.
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
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: "NEXT_PUBLIC_SUPABASE_ANON_KEY ausente. Veja .env.example.",
  }),
});

const serverOnlyEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
    message: "SUPABASE_SERVICE_ROLE_KEY ausente. Veja .env.example.",
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

/** Variaveis seguras para uso em Client Components. */
export const clientEnv = parseOrThrow(
  clientEnvSchema,
  {
    NEXT_PUBLIC_SUPABASE_URL: process.env["NEXT_PUBLIC_SUPABASE_URL"],
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  },
  "clientEnv",
);

/**
 * Variaveis restritas ao servidor. IMPORTAR SOMENTE em arquivos que nunca
 * sao enviados ao navegador (sem "use client" na cadeia de import).
 */
export const serverEnv = parseOrThrow(
  serverOnlyEnvSchema,
  {
    SUPABASE_SERVICE_ROLE_KEY: process.env["SUPABASE_SERVICE_ROLE_KEY"],
    APP_ENV: process.env["APP_ENV"],
  },
  "serverEnv",
);

/** Verdadeiro apenas no ambiente logico de producao (nunca dev/preview). */
export const isProductionEnvironment = serverEnv.APP_ENV === "production";

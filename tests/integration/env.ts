import path from "node:path";

/**
 * Carrega .env.local para process.env, sem nunca imprimir/logar nenhum
 * valor -- usa `process.loadEnvFile` nativo do Node (>=20.6), nenhuma
 * dependência adicional. Silenciosamente ignora se o arquivo não existir
 * (ex.: ambiente de CI que já injeta as variáveis por outro meio).
 */
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, "../../.env.local"));
} catch {
  // .env.local ausente -- segue com o que já estiver em process.env.
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente "${name}" ausente. Configure app/.env.local com o projeto ` +
        "Supabase de desenvolvimento antes de rodar os testes de integração.",
    );
  }
  return value;
}

/**
 * Getters (não constantes no topo do módulo) para que a ausência de uma
 * variável só quebre o teste que efetivamente precisa dela, com mensagem
 * clara -- e para nunca reter o valor em uma variável de módulo que algum
 * código futuro possa logar por engano.
 */
export const integrationEnv = {
  get supabaseUrl() {
    return requireEnv("SUPABASE_URL");
  },
  get publishableKey() {
    return requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  },
  get secretKey() {
    return requireEnv("SUPABASE_SECRET_KEY");
  },
  get appEnv() {
    return process.env["APP_ENV"] ?? "development";
  },
};

export function assertNotProduction() {
  if (integrationEnv.appEnv === "production") {
    throw new Error(
      "Recusando rodar testes de integração com APP_ENV=production -- estes testes criam/leem dados fictícios.",
    );
  }
}

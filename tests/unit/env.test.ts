import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * src/lib/env.ts valida process.env no momento do import (falha rapido).
 * Para testar isso isoladamente, cada teste reseta o cache de modulos e
 * controla as variaveis de ambiente antes de importar.
 */

const VALID_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://exemplo-projeto.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "chave-anonima-de-teste",
  SUPABASE_SERVICE_ROLE_KEY: "chave-service-role-de-teste",
  APP_ENV: "development",
};

function setEnv(vars: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) {
      vi.stubEnv(key, "");
      delete process.env[key];
    } else {
      vi.stubEnv(key, value);
    }
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("env", () => {
  it("carrega normalmente quando todas as variaveis obrigatorias estao presentes", async () => {
    setEnv(VALID_ENV);
    const { clientEnv, serverEnv, isProductionEnvironment } = await import("@/lib/env");
    expect(clientEnv.NEXT_PUBLIC_SUPABASE_URL).toBe(VALID_ENV.NEXT_PUBLIC_SUPABASE_URL);
    expect(serverEnv.APP_ENV).toBe("development");
    expect(isProductionEnvironment).toBe(false);
  });

  it("APP_ENV=production e refletido em isProductionEnvironment", async () => {
    setEnv({ ...VALID_ENV, APP_ENV: "production" });
    const { isProductionEnvironment } = await import("@/lib/env");
    expect(isProductionEnvironment).toBe(true);
  });

  it("lanca erro claro quando NEXT_PUBLIC_SUPABASE_URL esta ausente", async () => {
    setEnv({ ...VALID_ENV, NEXT_PUBLIC_SUPABASE_URL: undefined });
    await expect(import("@/lib/env")).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("lanca erro claro quando SUPABASE_SERVICE_ROLE_KEY esta ausente", async () => {
    setEnv({ ...VALID_ENV, SUPABASE_SERVICE_ROLE_KEY: undefined });
    await expect(import("@/lib/env")).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("rejeita NEXT_PUBLIC_SUPABASE_URL que nao e uma URL valida", async () => {
    setEnv({ ...VALID_ENV, NEXT_PUBLIC_SUPABASE_URL: "nao-e-uma-url" });
    await expect(import("@/lib/env")).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });
});

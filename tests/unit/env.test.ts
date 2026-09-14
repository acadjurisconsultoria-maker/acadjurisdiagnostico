import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * src/lib/env.ts valida process.env no momento do import (falha rapido).
 * Para testar isso isoladamente, cada teste reseta o cache de modulos e
 * controla as variaveis de ambiente antes de importar.
 *
 * Usa o padrao atual de chaves do Supabase (publishable/secret) -- nao as
 * chaves legadas (anon/service_role).
 */

const VALID_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://exemplo-projeto.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "chave-publishable-de-teste",
  SUPABASE_URL: "https://exemplo-projeto.supabase.co",
  SUPABASE_SECRET_KEY: "chave-secret-de-teste",
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
    expect(clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe(
      VALID_ENV.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
    expect(serverEnv.SUPABASE_URL).toBe(VALID_ENV.SUPABASE_URL);
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

  it("lanca erro claro quando NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY esta ausente", async () => {
    setEnv({ ...VALID_ENV, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined });
    await expect(import("@/lib/env")).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  });

  it("lanca erro claro quando SUPABASE_URL esta ausente", async () => {
    setEnv({ ...VALID_ENV, SUPABASE_URL: undefined });
    await expect(import("@/lib/env")).rejects.toThrow(/SUPABASE_URL/);
  });

  it("lanca erro claro quando SUPABASE_SECRET_KEY esta ausente", async () => {
    setEnv({ ...VALID_ENV, SUPABASE_SECRET_KEY: undefined });
    await expect(import("@/lib/env")).rejects.toThrow(/SUPABASE_SECRET_KEY/);
  });

  it("rejeita NEXT_PUBLIC_SUPABASE_URL que nao e uma URL valida", async () => {
    setEnv({ ...VALID_ENV, NEXT_PUBLIC_SUPABASE_URL: "nao-e-uma-url" });
    await expect(import("@/lib/env")).rejects.toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("rejeita SUPABASE_URL que nao e uma URL valida", async () => {
    setEnv({ ...VALID_ENV, SUPABASE_URL: "nao-e-uma-url" });
    await expect(import("@/lib/env")).rejects.toThrow(/SUPABASE_URL/);
  });

  it("nunca expõe SUPABASE_SECRET_KEY em clientEnv", async () => {
    setEnv(VALID_ENV);
    const mod = await import("@/lib/env");
    expect(Object.keys(mod.clientEnv)).not.toContain("SUPABASE_SECRET_KEY");
  });
});

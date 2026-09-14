import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Configuração separada da suíte de integração (tests/integration/**).
 *
 * Deliberadamente NÃO reaproveita `tests/setup.ts` (que define valores
 * fictícios de ambiente para a suíte unitária) -- a suíte de integração
 * precisa das variáveis REAIS do projeto Supabase de desenvolvimento,
 * carregadas de app/.env.local por tests/integration/env.ts (importado no
 * topo de cada arquivo de teste desta suíte).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "server-only": path.resolve(import.meta.dirname, "./tests/stubs/server-only.ts"),
    },
  },
});

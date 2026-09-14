import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    // tests/integration/** exige uma instancia Supabase local em execucao
    // (`supabase start`, que por sua vez exige Docker) -- excluido da
    // execucao padrao. Ver tests/integration/README.md.
    exclude: ["node_modules/**", "tests/integration/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // "server-only" lanca erro fora do bundler do Next.js (nao reconhece
      // o boundary de Server/Client Component em ambiente de teste puro).
      // Testes unitarios verificam apenas a logica, nao esse boundary --
      // que e garantido em tempo de build pelo `next build` (ver npm run check).
      "server-only": path.resolve(import.meta.dirname, "./tests/stubs/server-only.ts"),
    },
  },
});

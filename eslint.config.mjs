import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [".next/**", "node_modules/**", "supabase/.temp/**"],
  },
  {
    rules: {
      // Nenhum console.log de dado sensivel -- reforco do requisito de seguranca
      // "nao registrar documentos, respostas ou dados pessoais em logs".
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Script de linha de comando standalone -- console.log e a propria
    // finalidade (imprimir IDs/credenciais de teste geradas), nunca dado de
    // producao (o script recusa rodar com APP_ENV=production).
    files: ["supabase/seed/**"],
    rules: {
      "no-console": "off",
    },
  },
];

export default eslintConfig;

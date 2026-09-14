import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Nenhuma variavel de ambiente e declarada aqui com valor literal --
  // todas vem de process.env, validadas em src/lib/env.ts antes do uso.
};

export default nextConfig;

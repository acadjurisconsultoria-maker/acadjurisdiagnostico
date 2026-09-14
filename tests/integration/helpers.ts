import { integrationEnv, assertNotProduction } from "./env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

assertNotProduction();

/** Mesma senha usada por supabase/seed/seed-fictitious.mjs para todos os usuários de teste. */
export const SENHA_TESTE = "SenhaTeste!2026";

export function anonClient(): SupabaseClient {
  return createClient(integrationEnv.supabaseUrl, integrationEnv.publishableKey);
}

export function adminClient(): SupabaseClient {
  return createClient(integrationEnv.supabaseUrl, integrationEnv.secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function signInAs(email: string): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password: SENHA_TESTE });
  if (error) {
    throw new Error(
      `Falha ao autenticar ${email} -- rode "node supabase/seed/seed-fictitious.mjs" antes destes testes. Detalhe: ${error.message}`,
    );
  }
  return client;
}

/** E-mails fixos criados por supabase/seed/seed-fictitious.mjs. */
export const SEED_USERS = {
  consultorA: "consultor.a@teste.acadjuris.local",
  analistaA: "analista.a@teste.acadjuris.local",
  clienteA: "cliente.a@teste.acadjuris.local",
  consultorB: "consultor.b@teste.acadjuris.local",
  analistaB: "analista.b@teste.acadjuris.local",
  clienteB: "cliente.b@teste.acadjuris.local",
  superAdmin: "superadmin@teste.acadjuris.local",
  adminAcadjuris: "admin@teste.acadjuris.local",
  advogadoHabilitado: "advogado.habilitado@teste.acadjuris.local",
} as const;

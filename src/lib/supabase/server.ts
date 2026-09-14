import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route
 * Handlers, autenticado como o usuario da sessao atual (via cookies).
 *
 * Continua usando apenas a chave anonima -- a identidade do usuario vem do
 * cookie de sessao, e o acesso aos dados e sempre mediado por RLS. Este
 * cliente NUNCA ignora RLS; para operacoes que exigem ignorar RLS
 * deliberadamente (ex.: rotina administrativa server-side), use
 * `createSupabaseServiceRoleClient` em vez deste.
 *
 * O import "server-only" no topo deste arquivo faz o build falhar caso este
 * modulo seja importado, direta ou indiretamente, por um Client Component.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Chamado a partir de um Server Component (sem permissao de
            // escrever cookie) -- inofensivo se houver middleware
            // renovando a sessao em paralelo (ver src/middleware.ts).
          }
        },
      },
    },
  );
}

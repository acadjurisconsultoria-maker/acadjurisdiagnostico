import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { clientEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente Supabase para uso em Server Components, Server Actions e Route
 * Handlers, autenticado como o usuario da sessao atual (via cookies).
 *
 * Continua usando apenas a publishable key (nao a secret key) -- a
 * identidade do usuario vem do cookie de sessao, e o acesso aos dados e
 * sempre mediado por RLS. Este cliente NUNCA ignora RLS; para operacoes
 * que exigem ignorar RLS deliberadamente (ex.: rotina administrativa
 * server-side), use `createSupabaseAdminClient` (src/lib/supabase/admin.ts)
 * em vez deste.
 *
 * A URL vem da variavel de servidor (`SUPABASE_URL`), nao da variavel
 * prefixada com NEXT_PUBLIC_ -- disciplina de nomenclatura para que codigo
 * de servidor nunca dependa, mesmo que por acidente, de um nome pensado
 * para o navegador (a chave em si, essa sim, e a mesma publishable key
 * usada no navegador -- nao existe uma segunda publishable key so para
 * servidor).
 *
 * O import "server-only" no topo deste arquivo faz o build falhar caso este
 * modulo seja importado, direta ou indiretamente, por um Client Component.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    serverEnv.SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
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
            // escrever cookie) -- inofensivo se houver proxy renovando a
            // sessao em paralelo (ver src/proxy.ts).
          }
        },
      },
    },
  );
}

import "server-only";

import { createClient } from "@supabase/supabase-js";
import { clientEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente Supabase privilegiado -- IGNORA Row Level Security por completo.
 *
 * Uso extremamente restrito: apenas rotinas de servidor que precisam,
 * deliberadamente e por design, operar fora do RLS (ex.: job administrativo,
 * script de seed). Qualquer rota/Server Action que atenda diretamente a uma
 * requisicao de usuario deve usar `createSupabaseServerClient` (com RLS),
 * nunca este.
 *
 * O import "server-only" garante que o build falha se este arquivo for
 * importado por engano em um Client Component -- mas a disciplina de uso
 * correto (nao usar isto para responder requisicao de usuario comum)
 * depende de revisao de codigo, nao apenas desta protecao tecnica.
 */
export function createSupabaseServiceRoleClient() {
  return createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

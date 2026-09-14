"use client";

import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente Supabase para uso em Client Components.
 *
 * Usa exclusivamente a chave anonima (publica) -- o acesso real aos dados e
 * sempre controlado por Row Level Security no Postgres, nunca por esta
 * chave. NUNCA importe a chave service_role neste arquivo ou em qualquer
 * arquivo com a diretiva "use client".
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

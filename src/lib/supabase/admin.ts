import "server-only";

import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente privilegiado de servidor -- IGNORA Row Level Security por
 * completo (usa a secret key do Supabase, que substitui a antiga
 * "service_role key" -- mesmo nivel de privilegio, nomenclatura atual).
 *
 * Uso extremamente restrito: apenas rotinas de servidor que precisam,
 * deliberadamente e por design, operar fora do RLS (ex.: job administrativo,
 * script de seed, revogacao de acesso em cascata). Qualquer rota/Server
 * Action que atenda diretamente a uma requisicao de usuario comum deve usar
 * `createSupabaseServerClient` (com RLS, src/lib/supabase/server.ts), nunca
 * este.
 *
 * O import "server-only" garante que o build falha se este arquivo for
 * importado por engano em um Client Component -- mas a disciplina de uso
 * correto (nao usar isto para responder requisicao comum de usuario)
 * depende tambem da barreira de autorizacao abaixo e de revisao de codigo.
 */

/** Perfis autorizados a acionar o cliente privilegiado (Matriz-de-Perfis-e-Permissoes-v1.md). */
const ADMIN_CLIENT_ALLOWED_PERFIS = new Set(["super_admin", "admin_acadjuris"] as const);

export interface AdminClientAuthorization {
  /**
   * Perfil do usuario autenticado em nome de quem a operacao privilegiada
   * esta sendo executada -- nunca "porque o codigo pode", sempre "porque
   * este perfil especifico tem competencia para esta operacao".
   */
  actingPerfil: "super_admin" | "admin_acadjuris";
  /**
   * Descricao curta e especifica da operacao que exige ignorar RLS (ex.:
   * "revogar staff_project_access em cascata ao desativar projeto").
   * Nunca genérica ("operacao administrativa") -- deve ser suficiente para
   * uma revisao de codigo ou auditoria entender o motivo sem contexto
   * adicional.
   */
  operation: string;
}

/**
 * Cria o cliente privilegiado -- exige autorizacao explicita de perfil e
 * operacao (regra de produto: "antes de qualquer uso do cliente
 * privilegiado, deve existir autorizacao de aplicacao baseada no perfil e
 * na operacao solicitada"). Lanca erro em vez de permitir um uso silencioso
 * e não descrito.
 *
 * Isto NÃO substitui a checagem de perfil feita no banco (RLS continua
 * sendo a barreira real para todo o resto do sistema) -- é a barreira de
 * aplicação para este ponto específico, que por definição opera fora do
 * RLS.
 */
export function createSupabaseAdminClient(authorization: AdminClientAuthorization) {
  if (!ADMIN_CLIENT_ALLOWED_PERFIS.has(authorization.actingPerfil)) {
    throw new Error(
      `Perfil "${authorization.actingPerfil}" não está autorizado a acionar o cliente privilegiado de servidor.`,
    );
  }
  if (!authorization.operation || authorization.operation.trim().length === 0) {
    throw new Error(
      "Toda criação do cliente privilegiado exige a descrição da operação (para revisão/auditoria) -- nenhum uso silencioso é permitido.",
    );
  }

  return createClient<Database>(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

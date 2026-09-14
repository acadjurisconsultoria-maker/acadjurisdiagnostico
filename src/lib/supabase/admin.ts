import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { recordAuditEvent } from "@/lib/audit";
import type { Database } from "@/lib/supabase/database.types";
import type { EffectivePerfis } from "@/lib/auth/perfis";

/**
 * Cliente privilegiado de servidor -- IGNORA Row Level Security por
 * completo (usa a secret key do Supabase, que substitui a antiga
 * "service_role key" -- mesmo nivel de privilegio, nomenclatura atual).
 *
 * CORREÇÃO DE SEGURANÇA (rodada de revisão): a versão anterior deste
 * módulo aceitava `actingPerfil` como parâmetro informado pelo chamador --
 * isso NÃO é prova de autorização, pois qualquer código poderia alegar
 * `super_admin` sem realmente sê-lo. Esta versão deriva o perfil
 * exclusivamente da sessão autenticada (`auth.uid()` + consulta às tabelas
 * de vínculo no banco), nunca de um parâmetro. Não existe mais nenhuma
 * função exportada que construa o cliente privilegiado sem passar por essa
 * checagem -- `buildRawAdminClient` abaixo não é exportado.
 */

/** Perfis autorizados a acionar o cliente privilegiado (Matriz-de-Perfis-e-Permissoes-v1.md). */
type PrivilegedPerfil = "super_admin" | "admin_acadjuris";

/**
 * Lista fechada de operações privilegiadas. Adicionar uma operação aqui é
 * uma decisão deliberada (revisão de código), nunca implícita.
 *
 * NUNCA adicione aqui uma operação de aprovação de conteúdo jurídico da
 * metodologia -- essa competência exige o grant individual
 * `pode_aprovar_conteudo_juridico` (Gestao-da-Metodologia-e-Versionamento-
 * v2.md, seção 5.2), nunca decorre de `admin_acadjuris` ou `super_admin`.
 * O guard `assertOperationIsNotLegalApproval` abaixo é a segunda camada de
 * defesa contra isso, independente de revisão de código.
 */
const OPERATION_REQUIRED_PERFIS = {
  revoke_access_cascade: ["super_admin", "admin_acadjuris"],
  publish_methodology_version_technical: ["super_admin", "admin_acadjuris"],
  manage_users_and_organizations: ["super_admin", "admin_acadjuris"],
} as const satisfies Record<string, readonly PrivilegedPerfil[]>;

export type PrivilegedOperation = keyof typeof OPERATION_REQUIRED_PERFIS;

const LEGAL_APPROVAL_KEYWORDS = ["legal", "juridic", "aprovacao_conteudo", "approval_conteudo"];

function assertOperationIsNotLegalApproval(operation: string) {
  const normalized = operation.toLowerCase();
  if (LEGAL_APPROVAL_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    throw new Error(
      `Operação "${operation}" nunca pode ser autorizada via cliente administrativo -- ` +
        "aprovação de conteúdo jurídico exige o grant individual pode_aprovar_conteudo_juridico, " +
        "nunca decorre de admin_acadjuris ou super_admin.",
    );
  }
}

export interface AdminOperationContext {
  /** Organização relevante para a operação, quando aplicável -- apenas para a trilha de auditoria, nunca usada para decidir autorização. */
  organizationId?: string;
}

export class AdminAuthorizationError extends Error {}

function buildRawAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(serverEnv.SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function findAllowedPerfil(
  effective: EffectivePerfis,
  allowed: readonly PrivilegedPerfil[],
): PrivilegedPerfil | null {
  for (const perfil of effective.perfis) {
    if ((allowed as readonly string[]).includes(perfil)) {
      return perfil as PrivilegedPerfil;
    }
  }
  return null;
}

/**
 * Único ponto de entrada para obter o cliente privilegiado de servidor.
 *
 * 1. Parte de uma sessão autenticada (`getCurrentUserSession`, que lê
 *    `auth.uid()` da sessão via cookie -- nunca de um parâmetro).
 * 2. Consulta o perfil e o vínculo organizacional no banco (mesmas tabelas
 *    de vínculo usadas em toda a aplicação, via cliente com RLS).
 * 3. Verifica se algum dos perfis efetivos do usuário está na lista de
 *    perfis permitidos para a operação solicitada (lista fechada).
 * 4. Rejeita a operação se não estiver na lista fechada, ou se "parecer"
 *    uma aprovação de conteúdo jurídico (defesa em profundidade).
 * 5. Registra em auditoria: usuário, operação, organização (se informada),
 *    data (automática) e resultado -- tanto em caso de concessão quanto de
 *    recusa.
 *
 * Não existe parâmetro de perfil. O perfil nunca é aceito vindo de tela,
 * formulário, URL ou corpo de requisição -- é sempre derivado da sessão.
 */
export async function authorizeAdminOperation(
  operation: PrivilegedOperation,
  context: AdminOperationContext = {},
): Promise<SupabaseClient<Database>> {
  assertOperationIsNotLegalApproval(operation);

  const allowedPerfis = OPERATION_REQUIRED_PERFIS[operation];
  if (!allowedPerfis) {
    throw new AdminAuthorizationError(
      `Operação "${operation}" não está na lista fechada de operações privilegiadas.`,
    );
  }

  const session = await getCurrentUserSession();
  const actingPerfil = session ? findAllowedPerfil(session.effective, allowedPerfis) : null;
  const authorized = session !== null && actingPerfil !== null;

  // Auditoria via cliente com RLS (respeita a policy de INSERT de
  // audit_event: actor_user_id precisa ser o proprio usuario autenticado).
  // Se nao houver sessao, nao ha auth.uid() para satisfazer essa policy --
  // nesse caso o evento de tentativa nao autenticada nao pode ser
  // persistido pela via normal; ainda assim a operacao e recusada abaixo.
  if (session) {
    const supabaseForAudit = await createSupabaseServerClient();
    await recordAuditEvent(supabaseForAudit, {
      actorUserId: session.userId,
      action: authorized ? "admin_operation_granted" : "admin_operation_denied",
      entityTable: "admin_client",
      justification:
        `operation=${operation}` +
        `; organizationId=${context.organizationId ?? "-"}` +
        `; actingPerfil=${actingPerfil ?? "nenhum perfil elegível"}`,
    });
  }

  if (!session) {
    throw new AdminAuthorizationError("Operação privilegiada exige sessão autenticada.");
  }
  if (!authorized) {
    throw new AdminAuthorizationError(
      `Usuário não possui perfil autorizado para a operação "${operation}".`,
    );
  }

  return buildRawAdminClient();
}

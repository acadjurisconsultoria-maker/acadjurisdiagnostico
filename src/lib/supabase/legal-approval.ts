import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Autorização de aprovação de conteúdo jurídico da metodologia.
 *
 * MECANISMO ESTRUTURALMENTE INDEPENDENTE de `src/lib/supabase/admin.ts` --
 * esta função nunca consulta `super_admin_grant` nem `admin_acadjuris_grant`,
 * e nunca decide autorização a partir do nome de uma operação. Verifica
 * exclusivamente `legal_content_approval_grant` (migration 0004), a
 * habilitação individual definida em `Gestao-da-Metodologia-e-
 * Versionamento-v2.md`, seção 5.2 (Consultor Responsável designado / Head
 * da Consultoria / advogado habilitado).
 *
 * Isto responde diretamente à limitação identificada na rodada anterior:
 * o bloqueio por palavra-chave em `admin.ts` (`assertOperationIsNotLegalApproval`)
 * é apenas uma segunda camada de defesa -- a primeira
 * camada, real, é a ausência estrutural de qualquer operação de aprovação
 * jurídica na lista fechada de `admin.ts` MAIS a existência desta função
 * dedicada, que nenhuma outra parte do sistema pode contornar para obter
 * competência de aprovação jurídica.
 *
 * Usa o cliente com RLS (nunca o cliente privilegiado) -- aprovar conteúdo
 * jurídico não exige ignorar RLS, exige apenas confirmar a habilitação.
 */

export class LegalApprovalAuthorizationError extends Error {}

export interface LegalApprovalAuthorization {
  userId: string;
  supabase: SupabaseClient<Database>;
}

export async function authorizeLegalContentApproval(): Promise<LegalApprovalAuthorization> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new LegalApprovalAuthorizationError(
      "Aprovação de conteúdo jurídico exige sessão autenticada.",
    );
  }

  const { data: grant } = await supabase
    .from("legal_content_approval_grant")
    .select("user_id")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle();

  if (!grant) {
    throw new LegalApprovalAuthorizationError(
      "Usuário não possui habilitação individual para aprovar conteúdo jurídico " +
        "(legal_content_approval_grant) -- perfil administrativo, por si só, nunca concede essa competência.",
    );
  }

  return { userId: user.id, supabase };
}

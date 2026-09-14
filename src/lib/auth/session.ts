import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  computeEffectivePerfis,
  type EffectivePerfis,
  type RawUserGrants,
} from "@/lib/auth/perfis";

/**
 * Le a sessao autenticada atual e calcula os perfis efetivos do usuario,
 * consultando as tabelas de vinculo (nunca um claim fixo de JWT).
 *
 * RLS garante que cada consulta abaixo so retorna linhas do proprio
 * usuario ou visiveis a ele -- mesmo que este codigo tivesse um bug, o
 * banco e a barreira real (Modelo-de-Seguranca-Multitenant-e-Segregacao-
 * de-Dados-v1.md, secao 1).
 *
 * Retorna null se nao houver usuario autenticado.
 */
export async function getCurrentUserSession(): Promise<{
  userId: string;
  email: string | null;
  effective: EffectivePerfis;
} | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [superAdminResult, adminAcadjurisResult, staffGrantsResult, clientGrantsResult] =
    await Promise.all([
      supabase
        .from("super_admin_grant")
        .select("user_id")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .maybeSingle(),
      supabase
        .from("admin_acadjuris_grant")
        .select("user_id")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .maybeSingle(),
      supabase
        .from("staff_project_access")
        .select("project_id, perfil, revoked_at")
        .eq("user_id", user.id),
      supabase
        .from("client_access")
        .select("organization_id, company_id, unit_id, project_id, revoked_at")
        .eq("user_id", user.id),
    ]);

  const raw: RawUserGrants = {
    isSuperAdmin: superAdminResult.data !== null,
    isAdminAcadjuris: adminAcadjurisResult.data !== null,
    staffProjectGrants: (staffGrantsResult.data ?? []).map((row) => ({
      projectId: row.project_id,
      perfil: row.perfil,
      revokedAt: row.revoked_at,
    })),
    clientGrants: (clientGrantsResult.data ?? []).map((row) => ({
      organizationId: row.organization_id,
      companyId: row.company_id,
      unitId: row.unit_id,
      projectId: row.project_id,
      revokedAt: row.revoked_at,
    })),
  };

  return {
    userId: user.id,
    email: user.email ?? null,
    effective: computeEffectivePerfis(raw),
  };
}

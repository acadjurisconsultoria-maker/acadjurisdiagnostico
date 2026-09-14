/**
 * Modelo dos 5 perfis do sistema (Matriz-de-Perfis-e-Permissoes-v1.md, secao 1):
 * Super Administrador, Administrador AcadJuris, Consultor Responsavel,
 * Analista/Auditor, Usuario da Cliente.
 *
 * Este modulo e logica pura (sem I/O) para poder ser testada sem uma
 * instancia Supabase em execucao. A leitura real dos grants (tabelas
 * super_admin_grant, admin_acadjuris_grant, staff_project_access,
 * client_access) acontece em src/lib/auth/session.ts (Ciclo 0: leitura
 * minima para o login funcionar; uso extenso nas telas fica para os
 * proximos ciclos).
 */

export type PerfilInterno =
  | "super_admin"
  | "admin_acadjuris"
  | "consultor_responsavel"
  | "analista_auditor";

export type Perfil = PerfilInterno | "cliente";

export interface StaffProjectGrant {
  projectId: string;
  perfil: "admin_acadjuris" | "consultor_responsavel" | "analista_auditor";
  revokedAt: string | null;
}

export interface ClientGrant {
  organizationId: string;
  companyId: string | null;
  unitId: string | null;
  projectId: string | null;
  revokedAt: string | null;
}

export interface RawUserGrants {
  isSuperAdmin: boolean;
  isAdminAcadjuris: boolean;
  staffProjectGrants: StaffProjectGrant[];
  clientGrants: ClientGrant[];
}

export interface EffectivePerfis {
  /** Todos os perfis que o usuario efetivamente possui, considerando revogacoes. */
  perfis: Perfil[];
  /** true se o usuario tem qualquer perfil interno (equipe AcadJuris). */
  isStaff: boolean;
  /** true se o usuario tem acesso como Usuario da Cliente a pelo menos um vinculo ativo. */
  isClient: boolean;
  /** IDs de projeto aos quais o usuario tem acesso como equipe interna (ativo). */
  staffProjectIds: string[];
  /** IDs de organizacao aos quais o usuario tem acesso como cliente (ativo). */
  clientOrganizationIds: string[];
}

function isActive<T extends { revokedAt: string | null }>(grant: T): boolean {
  return grant.revokedAt === null;
}

/**
 * Calcula os perfis efetivos de um usuario a partir dos grants brutos lidos
 * do banco. Grants revogados (revokedAt != null) nunca contam.
 */
export function computeEffectivePerfis(raw: RawUserGrants): EffectivePerfis {
  const perfis = new Set<Perfil>();

  if (raw.isSuperAdmin) {
    perfis.add("super_admin");
  }
  if (raw.isAdminAcadjuris) {
    perfis.add("admin_acadjuris");
  }

  const activeStaffGrants = raw.staffProjectGrants.filter(isActive);
  for (const grant of activeStaffGrants) {
    perfis.add(grant.perfil);
  }

  const activeClientGrants = raw.clientGrants.filter(isActive);
  if (activeClientGrants.length > 0) {
    perfis.add("cliente");
  }

  const isStaff =
    raw.isSuperAdmin || raw.isAdminAcadjuris || activeStaffGrants.length > 0;

  return {
    perfis: Array.from(perfis),
    isStaff,
    isClient: activeClientGrants.length > 0,
    staffProjectIds: Array.from(new Set(activeStaffGrants.map((g) => g.projectId))),
    clientOrganizationIds: Array.from(
      new Set(activeClientGrants.map((g) => g.organizationId)),
    ),
  };
}

/** Perfis para os quais MFA e obrigatorio (Matriz-de-Perfis-e-Permissoes-v5.md, secao 9). */
const MFA_OBRIGATORIO: ReadonlySet<Perfil> = new Set<Perfil>([
  "super_admin",
  "admin_acadjuris",
  "consultor_responsavel",
  "analista_auditor",
]);

/** true se, dados os perfis efetivos do usuario, MFA e obrigatorio para ele. */
export function requiresMfa(effective: EffectivePerfis): boolean {
  return effective.perfis.some((perfil) => MFA_OBRIGATORIO.has(perfil));
}

/**
 * Rota inicial apos login, por perfil -- equipe interna vai ao Painel do
 * Consultor, Usuario da Cliente vai ao Painel da Cliente. Um usuario com
 * mais de um perfil (raro, mas permitido) prioriza o Painel do Consultor.
 */
export function landingPathFor(effective: EffectivePerfis): string {
  if (effective.isStaff) {
    return "/consultor";
  }
  if (effective.isClient) {
    return "/cliente";
  }
  return "/sem-acesso";
}

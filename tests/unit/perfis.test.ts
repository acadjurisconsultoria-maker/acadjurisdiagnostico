import { describe, expect, it } from "vitest";
import {
  computeEffectivePerfis,
  landingPathFor,
  requiresMfa,
  type RawUserGrants,
} from "@/lib/auth/perfis";

function baseGrants(overrides: Partial<RawUserGrants> = {}): RawUserGrants {
  return {
    isSuperAdmin: false,
    isAdminAcadjuris: false,
    staffProjectGrants: [],
    clientGrants: [],
    ...overrides,
  };
}

describe("computeEffectivePerfis", () => {
  it("usuario sem nenhum vinculo nao e staff nem cliente", () => {
    const effective = computeEffectivePerfis(baseGrants());
    expect(effective.perfis).toEqual([]);
    expect(effective.isStaff).toBe(false);
    expect(effective.isClient).toBe(false);
  });

  it("super admin e reconhecido como staff", () => {
    const effective = computeEffectivePerfis(baseGrants({ isSuperAdmin: true }));
    expect(effective.perfis).toContain("super_admin");
    expect(effective.isStaff).toBe(true);
  });

  it("admin acadjuris e reconhecido como staff", () => {
    const effective = computeEffectivePerfis(baseGrants({ isAdminAcadjuris: true }));
    expect(effective.perfis).toContain("admin_acadjuris");
    expect(effective.isStaff).toBe(true);
  });

  it("consultor com vinculo ativo em um projeto e reconhecido como staff", () => {
    const effective = computeEffectivePerfis(
      baseGrants({
        staffProjectGrants: [
          { projectId: "projeto-1", perfil: "consultor_responsavel", revokedAt: null },
        ],
      }),
    );
    expect(effective.perfis).toContain("consultor_responsavel");
    expect(effective.isStaff).toBe(true);
    expect(effective.staffProjectIds).toEqual(["projeto-1"]);
  });

  it("vinculo de staff revogado nunca conta", () => {
    const effective = computeEffectivePerfis(
      baseGrants({
        staffProjectGrants: [
          {
            projectId: "projeto-1",
            perfil: "analista_auditor",
            revokedAt: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    );
    expect(effective.perfis).not.toContain("analista_auditor");
    expect(effective.isStaff).toBe(false);
    expect(effective.staffProjectIds).toEqual([]);
  });

  it("cliente com vinculo ativo e reconhecido, revogado nao conta", () => {
    const effective = computeEffectivePerfis(
      baseGrants({
        clientGrants: [
          {
            organizationId: "org-1",
            companyId: null,
            unitId: null,
            projectId: null,
            revokedAt: null,
          },
          {
            organizationId: "org-2",
            companyId: null,
            unitId: null,
            projectId: null,
            revokedAt: "2026-01-01T00:00:00Z",
          },
        ],
      }),
    );
    expect(effective.perfis).toContain("cliente");
    expect(effective.isClient).toBe(true);
    expect(effective.clientOrganizationIds).toEqual(["org-1"]);
  });

  it("usuario pode acumular perfil de staff e de cliente simultaneamente", () => {
    const effective = computeEffectivePerfis(
      baseGrants({
        isAdminAcadjuris: true,
        clientGrants: [
          {
            organizationId: "org-1",
            companyId: null,
            unitId: null,
            projectId: null,
            revokedAt: null,
          },
        ],
      }),
    );
    expect(effective.isStaff).toBe(true);
    expect(effective.isClient).toBe(true);
  });
});

describe("requiresMfa", () => {
  it("exige MFA para os 4 perfis internos", () => {
    for (const perfil of [
      "super_admin",
      "admin_acadjuris",
      "consultor_responsavel",
      "analista_auditor",
    ] as const) {
      const effective = computeEffectivePerfis(
        perfil === "super_admin"
          ? baseGrants({ isSuperAdmin: true })
          : perfil === "admin_acadjuris"
            ? baseGrants({ isAdminAcadjuris: true })
            : baseGrants({
                staffProjectGrants: [
                  { projectId: "p1", perfil, revokedAt: null },
                ],
              }),
      );
      expect(requiresMfa(effective)).toBe(true);
    }
  });

  it("nao exige MFA (nesta rodada) para cliente puro", () => {
    const effective = computeEffectivePerfis(
      baseGrants({
        clientGrants: [
          {
            organizationId: "org-1",
            companyId: null,
            unitId: null,
            projectId: null,
            revokedAt: null,
          },
        ],
      }),
    );
    expect(requiresMfa(effective)).toBe(false);
  });
});

describe("landingPathFor", () => {
  it("equipe interna vai para /consultor", () => {
    const effective = computeEffectivePerfis(baseGrants({ isAdminAcadjuris: true }));
    expect(landingPathFor(effective)).toBe("/consultor");
  });

  it("cliente puro vai para /cliente", () => {
    const effective = computeEffectivePerfis(
      baseGrants({
        clientGrants: [
          {
            organizationId: "org-1",
            companyId: null,
            unitId: null,
            projectId: null,
            revokedAt: null,
          },
        ],
      }),
    );
    expect(landingPathFor(effective)).toBe("/cliente");
  });

  it("usuario sem nenhum vinculo vai para /sem-acesso", () => {
    const effective = computeEffectivePerfis(baseGrants());
    expect(landingPathFor(effective)).toBe("/sem-acesso");
  });

  it("usuario com staff e cliente prioriza /consultor", () => {
    const effective = computeEffectivePerfis(
      baseGrants({
        isAdminAcadjuris: true,
        clientGrants: [
          {
            organizationId: "org-1",
            companyId: null,
            unitId: null,
            projectId: null,
            revokedAt: null,
          },
        ],
      }),
    );
    expect(landingPathFor(effective)).toBe("/consultor");
  });
});

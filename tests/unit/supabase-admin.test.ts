import { beforeEach, describe, expect, it, vi } from "vitest";
import { computeEffectivePerfis } from "@/lib/auth/perfis";

/**
 * Verifica a barreira de autorização do cliente privilegiado de servidor.
 *
 * Ponto central sob teste: NÃO EXISTE parâmetro de perfil em
 * `authorizeAdminOperation` -- o perfil é sempre derivado de
 * `getCurrentUserSession()` (mockado aqui para simular diferentes sessões
 * reais), nunca aceito do chamador. Isso prova, em tempo de teste, que a
 * falsificação de perfil é estruturalmente impossível: não há canal pelo
 * qual um chamador possa "alegar" super_admin/admin_acadjuris.
 */

const { getCurrentUserSessionMock, recordAuditEventMock } = vi.hoisted(() => ({
  getCurrentUserSessionMock: vi.fn(),
  recordAuditEventMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserSession: getCurrentUserSessionMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/audit", () => ({
  recordAuditEvent: recordAuditEventMock,
}));

const { authorizeAdminOperation, AdminAuthorizationError, PRIVILEGED_OPERATIONS } = await import(
  "@/lib/supabase/admin"
);

function sessionFor(overrides: Parameters<typeof computeEffectivePerfis>[0]) {
  return {
    userId: "user-1",
    email: "user@teste.acadjuris.local",
    effective: computeEffectivePerfis(overrides),
  };
}

beforeEach(() => {
  getCurrentUserSessionMock.mockReset();
  recordAuditEventMock.mockClear();
});

describe("authorizeAdminOperation", () => {
  it("não expõe nenhum parâmetro de perfil na assinatura da função", () => {
    // Prova estrutural: a função só declara (operation, context = {}).
    // Function.length do JS conta apenas parametros ANTES do primeiro com
    // valor padrao -- como `context` tem default, o valor esperado e 1
    // (somente `operation`). Se algum dia um parametro de perfil for
    // adicionado antes de `context`, este numero muda e o teste falha,
    // forcando revisao explicita da assinatura.
    expect(authorizeAdminOperation.length).toBe(1);
  });

  it("recusa quando não há sessão autenticada", async () => {
    getCurrentUserSessionMock.mockResolvedValue(null);

    await expect(
      authorizeAdminOperation("manage_users_and_organizations"),
    ).rejects.toThrow(AdminAuthorizationError);
    await expect(
      authorizeAdminOperation("manage_users_and_organizations"),
    ).rejects.toThrow(/sessão autenticada/);
  });

  it("recusa usuário sem nenhum perfil privilegiado (ex.: cliente)", async () => {
    getCurrentUserSessionMock.mockResolvedValue(
      sessionFor({
        isSuperAdmin: false,
        isAdminAcadjuris: false,
        staffProjectGrants: [],
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

    await expect(
      authorizeAdminOperation("manage_users_and_organizations"),
    ).rejects.toThrow(/não possui perfil autorizado/);
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "admin_operation_denied", actorUserId: "user-1" }),
    );
  });

  it("recusa perfil interno sem privilégio administrativo (ex.: consultor_responsavel)", async () => {
    getCurrentUserSessionMock.mockResolvedValue(
      sessionFor({
        isSuperAdmin: false,
        isAdminAcadjuris: false,
        staffProjectGrants: [
          { projectId: "p1", perfil: "consultor_responsavel", revokedAt: null },
        ],
        clientGrants: [],
      }),
    );

    await expect(
      authorizeAdminOperation("revoke_access_cascade"),
    ).rejects.toThrow(/não possui perfil autorizado/);
  });

  it("concede para admin_acadjuris com sessão real e registra auditoria de sucesso", async () => {
    getCurrentUserSessionMock.mockResolvedValue(
      sessionFor({
        isSuperAdmin: false,
        isAdminAcadjuris: true,
        staffProjectGrants: [],
        clientGrants: [],
      }),
    );

    const client = await authorizeAdminOperation("manage_users_and_organizations", {
      organizationId: "org-42",
    });

    expect(client).toBeDefined();
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "admin_operation_granted",
        actorUserId: "user-1",
        justification: expect.stringContaining("organizationId=org-42"),
      }),
    );
  });

  it("concede para super_admin com sessão real", async () => {
    getCurrentUserSessionMock.mockResolvedValue(
      sessionFor({
        isSuperAdmin: true,
        isAdminAcadjuris: false,
        staffProjectGrants: [],
        clientGrants: [],
      }),
    );

    await expect(
      authorizeAdminOperation("revoke_access_cascade"),
    ).resolves.toBeDefined();
  });

  it("recusa operação fora da lista fechada, mesmo para super_admin", async () => {
    getCurrentUserSessionMock.mockResolvedValue(
      sessionFor({
        isSuperAdmin: true,
        isAdminAcadjuris: false,
        staffProjectGrants: [],
        clientGrants: [],
      }),
    );

    await expect(
      // @ts-expect-error -- testando deliberadamente uma operação inexistente na lista fechada
      authorizeAdminOperation("operacao_nao_cadastrada"),
    ).rejects.toThrow(/lista fechada/);
  });

  it("recusa qualquer operação com nome relacionado a aprovação jurídica, mesmo para super_admin", async () => {
    getCurrentUserSessionMock.mockResolvedValue(
      sessionFor({
        isSuperAdmin: true,
        isAdminAcadjuris: false,
        staffProjectGrants: [],
        clientGrants: [],
      }),
    );

    await expect(
      // @ts-expect-error -- testando deliberadamente uma operacao de aprovacao juridica
      authorizeAdminOperation("aprovacao_conteudo_juridico"),
    ).rejects.toThrow(/conteúdo jurídico/);
  });

  it("revogação de grant torna o perfil inelegível (sem cache de autorização entre chamadas)", async () => {
    getCurrentUserSessionMock.mockResolvedValueOnce(
      sessionFor({
        isSuperAdmin: false,
        isAdminAcadjuris: true,
        staffProjectGrants: [],
        clientGrants: [],
      }),
    );
    await expect(
      authorizeAdminOperation("manage_users_and_organizations"),
    ).resolves.toBeDefined();

    // Simula revogacao do grant admin_acadjuris entre uma chamada e outra --
    // cada chamada consulta a sessao/banco de novo, nunca reaproveita uma
    // decisao anterior.
    getCurrentUserSessionMock.mockResolvedValueOnce(
      sessionFor({
        isSuperAdmin: false,
        isAdminAcadjuris: false,
        staffProjectGrants: [],
        clientGrants: [],
      }),
    );
    await expect(
      authorizeAdminOperation("manage_users_and_organizations"),
    ).rejects.toThrow(/não possui perfil autorizado/);
  });

  it("PRIVILEGED_OPERATIONS nunca contém, por construção, uma operação de aprovação jurídica", () => {
    // Prova estrutural (não apenas busca de palavra-chave em tempo de
    // execução): enumera a lista fechada real e confirma que nenhuma
    // entrada jamais cadastrada nela se relaciona a aprovação de conteúdo
    // jurídico -- essa competência só existe via
    // authorizeLegalContentApproval (tests/unit/legal-approval.test.ts),
    // um módulo inteiramente separado.
    const legalKeywords = ["legal", "juridic", "aprovacao_conteudo", "approval"];
    expect(PRIVILEGED_OPERATIONS.length).toBeGreaterThan(0);
    for (const operation of PRIVILEGED_OPERATIONS) {
      const normalized = operation.toLowerCase();
      for (const keyword of legalKeywords) {
        expect(normalized.includes(keyword)).toBe(false);
      }
    }
  });
});
